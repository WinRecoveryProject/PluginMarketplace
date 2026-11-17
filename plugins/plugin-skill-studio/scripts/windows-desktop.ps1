# Private local evidence only. No network, credentials, app bindings or installers.
$ErrorActionPreference='Stop'
[Console]::InputEncoding=New-Object Text.UTF8Encoding($false)
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
$inputSent=$false
$cursorMoved=$false
try {
  $raw=[Console]::In.ReadToEnd()
  if($raw.Length -gt 131072){throw 'Request exceeds limit'}
  $request=$raw|ConvertFrom-Json
  function Assert-LocalPath([string]$value){
    if($value -notmatch '^[A-Za-z]:[\\/]'){throw 'Only absolute local drive paths are supported; UNC/device paths are refused'}
    $drive=New-Object IO.DriveInfo($value.Substring(0,3))
    if($drive.DriveType -eq [IO.DriveType]::Network -or -not $drive.IsReady){throw 'Network or unavailable drives are refused'}
    $full=[IO.Path]::GetFullPath($value);$cursor=[IO.Path]::GetPathRoot($full)
    foreach($part in $full.Substring($cursor.Length).Split([char[]]@('\','/'),[StringSplitOptions]::RemoveEmptyEntries)){
      $cursor=[IO.Path]::Combine($cursor,$part)
      try{$attributes=[IO.File]::GetAttributes($cursor)}catch [IO.FileNotFoundException]{break}catch [IO.DirectoryNotFoundException]{break}
      if(($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'Reparse-point paths are refused; use a physical local directory'}
    }
  }
  function Get-Sha([string]$file){
    Assert-LocalPath $file
    $sha=[Security.Cryptography.SHA256]::Create();$stream=[IO.File]::OpenRead($file)
    try{return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','')}finally{$stream.Dispose();$sha.Dispose()}
  }
  if($request.action -eq 'validate-paths'){
    if(-not $request.paths -or $request.paths.Count -gt 8){throw 'Supply bounded local paths'}
    foreach($file in $request.paths){Assert-LocalPath ([string]$file)}
    [ordered]@{ok=$true;localPaths=$true;inputSent=$false}|ConvertTo-Json -Compress
    exit 0
  }
  if($request.action -notin @('list','scope','inspect','activate','capture','click','scroll')){throw 'Unknown desktop action'}
  if($request.action -in @('activate','click','scroll') -and ($request.execute -isnot [bool] -or $request.execute -ne $true)){throw 'Live input requires execute=true and prior user authorization'}
  Add-Type -AssemblyName System.Drawing
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class StudioDesktop {
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
 [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint Size,Tick; }
 public delegate bool EnumProc(IntPtr hwnd,IntPtr p);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback,IntPtr p);
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,System.Text.StringBuilder text,int size);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT point);
 [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern bool GetPhysicalCursorPos(out POINT point);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint x,uint y,uint data,UIntPtr extra);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int mode);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
}
'@
  $oldDpi=[StudioDesktop]::SetThreadDpiAwarenessContext([IntPtr](-4))
  function Get-Tick {
    $v=New-Object StudioDesktop+LASTINPUTINFO;$v.Size=[Runtime.InteropServices.Marshal]::SizeOf($v)
    if(-not [StudioDesktop]::GetLastInputInfo([ref]$v)){throw 'Cannot observe recent input'}
    return $v.Tick
  }
  function Get-Identity([long]$handle){
    $hwnd=[IntPtr]$handle
    if($handle -le 0 -or -not [StudioDesktop]::IsWindow($hwnd)){throw 'Window no longer exists'}
    [uint32]$owner=0;[void][StudioDesktop]::GetWindowThreadProcessId($hwnd,[ref]$owner)
    $p=Get-Process -Id $owner -ErrorAction Stop
    if($p.ProcessName -match '^(LockApp|LogonUI|winlogon|CredentialUIBroker|consent|SecurityHealth.*|Taskmgr|SystemSettings|regedit|WindowsTerminal|powershell|pwsh|cmd|KeePass.*|1Password|Bitwarden)$'){throw 'Protected or unsupported desktop target'}
    $title=New-Object Text.StringBuilder 1024;[void][StudioDesktop]::GetWindowText($hwnd,$title,$title.Capacity)
    return [ordered]@{kind='studio-desktop-scope';windowHandle=$handle;processId=[int]$owner;processStart=$p.StartTime.ToUniversalTime().ToString('o');executable=$p.Path;processName=$p.ProcessName;title=$title.ToString()}
  }
  function Assert-Scope {
    $live=Get-Identity ([long]$request.scope.windowHandle)
    foreach($key in @('kind','windowHandle','processId','processStart','executable','processName')){
      if($live[$key] -cne $request.scope.$key){throw "Target identity changed ($key); no input sent"}
    }
    return $live
  }
  function Get-Bounds {
    $null=Assert-Scope;$hwnd=[IntPtr]([long]$request.scope.windowHandle)
    if(-not [StudioDesktop]::IsWindowVisible($hwnd) -or [StudioDesktop]::IsIconic($hwnd)){throw 'Target must be visible and restored'}
    if([StudioDesktop]::GetAncestor([StudioDesktop]::GetForegroundWindow(),2) -ne $hwnd){throw 'Target is not foreground; reobserve before activating'}
    $r=New-Object StudioDesktop+RECT
    if(-not [StudioDesktop]::GetWindowRect($hwnd,[ref]$r)){throw 'Cannot read target geometry'}
    $w=$r.Right-$r.Left;$h=$r.Bottom-$r.Top
    if($w -lt 1 -or $h -lt 1 -or $w -gt 8192 -or $h -gt 8192){throw 'Invalid target geometry'}
    return [ordered]@{left=$r.Left;top=$r.Top;width=$w;height=$h}
  }
  function Save-NewJson($value,[string]$file){
    $bytes=[Text.Encoding]::UTF8.GetBytes(($value|ConvertTo-Json -Depth 10))
    $stream=[IO.File]::Open($file,[IO.FileMode]::CreateNew)
    try{$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
  }
  $result=[ordered]@{ok=$true;action=$request.action;backend='local-windows-gdi-user32';inputSent=$false}
  switch($request.action){
    'list' {
      $windows=New-Object Collections.Generic.List[object]
      $callback=[StudioDesktop+EnumProc]{param($hwnd,$unused)
        if([StudioDesktop]::IsWindowVisible($hwnd)){
          try{$item=Get-Identity $hwnd.ToInt64();if($item.title){$windows.Add($item)}}catch{}
        }
        return $true
      }
      [void][StudioDesktop]::EnumWindows($callback,[IntPtr]::Zero)
      $result.windows=@($windows.ToArray())
    }
    'scope' {$result.scope=Get-Identity ([long]$request.windowHandle)}
    'inspect' {
      $result.scope=Assert-Scope
      Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes
      $element=[Windows.Automation.AutomationElement]::FromHandle([IntPtr]([long]$request.scope.windowHandle))
      $all=$element.FindAll([Windows.Automation.TreeScope]::Descendants,[Windows.Automation.Condition]::TrueCondition)
      $items=New-Object Collections.Generic.List[object]
      for($i=0;$i -lt $all.Count -and $items.Count -lt 500;$i++){
        $e=$all[$i]
        try{
          $c=$e.Current;if($c.IsOffscreen -or $c.IsPassword){continue}
          $b=$c.BoundingRectangle
          $coordinates=@($b.X,$b.Y,$b.Width,$b.Height)
          if($b.IsEmpty -or @($coordinates|Where-Object {[double]::IsNaN($_) -or [double]::IsInfinity($_)}).Count){$coordinates=@()}
          $item=[ordered]@{name=$c.Name;type=$c.ControlType.ProgrammaticName;enabled=$c.IsEnabled;focused=$c.HasKeyboardFocus;bounds=$coordinates}
          $value=$null;if($e.TryGetCurrentPattern([Windows.Automation.ValuePattern]::Pattern,[ref]$value)){$item.value=$value.Current.Value}
          $items.Add($item)
        }catch{}
      }
      $result.elements=@($items.ToArray());$result.truncated=$items.Count -ge 500
    }
    'activate' {
      $result.scope=Assert-Scope
      $foreground=[StudioDesktop]::GetForegroundWindow()
      if($foreground -ne [IntPtr]::Zero){$null=Get-Identity $foreground.ToInt64()}
      $hwnd=[IntPtr]([long]$request.scope.windowHandle)
      [void][StudioDesktop]::ShowWindow($hwnd,9)
      [void][StudioDesktop]::SetForegroundWindow($hwnd)
      if([StudioDesktop]::GetForegroundWindow() -ne $hwnd){throw 'Windows refused foreground activation; user restoration is required'}
      $result.activated=$true
    }
    'capture' {
      $bounds=Get-Bounds;$tick=Get-Tick
      Assert-LocalPath $request.directory
      $null=[IO.Directory]::CreateDirectory($request.directory)
      $stem='studio-desktop-'+[Guid]::NewGuid().ToString('N')
      $image=Join-Path $request.directory ($stem+'.png');$receipt=$image+'.json'
      $bitmap=New-Object Drawing.Bitmap($bounds.width,$bounds.height);$graphics=[Drawing.Graphics]::FromImage($bitmap)
      try{
        $graphics.CopyFromScreen($bounds.left,$bounds.top,0,0,$bitmap.Size,[Drawing.CopyPixelOperation]::SourceCopy)
        $after=Get-Bounds
        if(($bounds|ConvertTo-Json -Compress) -ne ($after|ConvertTo-Json -Compress) -or (Get-Tick) -ne $tick){throw 'Target or input changed during capture; retry observation'}
        $stream=[IO.File]::Open($image,[IO.FileMode]::CreateNew)
        try{$bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)}finally{$stream.Dispose()}
      }finally{$graphics.Dispose();$bitmap.Dispose()}
      $snapshot=[ordered]@{kind='studio-desktop-snapshot';at=[DateTimeOffset]::UtcNow.ToString('o');scope=$request.scope;bounds=$bounds;lastInputTick=$tick;imagePath=$image;imageSha256=(Get-Sha $image);receiptPath=$receipt}
      Save-NewJson $snapshot $receipt
      $result.snapshot=$snapshot
    }
    {$_ -in @('click','scroll')} {
      Assert-LocalPath $request.snapshot
      $bounds=Get-Bounds;$snapshot=[IO.File]::ReadAllText($request.snapshot)|ConvertFrom-Json
      if($snapshot.kind -ne 'studio-desktop-snapshot'){throw 'Invalid snapshot kind'}
      foreach($key in @('windowHandle','processId','processStart','executable','processName')){if($snapshot.scope.$key -cne $request.scope.$key){throw 'Snapshot target mismatch'}}
      $age=([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse($snapshot.at)).TotalSeconds
      if($age -lt 0 -or $age -gt 60){throw 'Snapshot is stale'}
      if(($bounds|ConvertTo-Json -Compress) -ne ($snapshot.bounds|ConvertTo-Json -Compress)){throw 'Target geometry changed'}
      if((Get-Sha $snapshot.imagePath) -ne $snapshot.imageSha256){throw 'Snapshot image changed'}
      if((Get-Tick) -ne $snapshot.lastInputTick){throw 'Input occurred since capture; reobserve'}
      $x=[int]$request.x;$y=[int]$request.y
      if($x -lt 0 -or $y -lt 0 -or $x -ge $bounds.width -or $y -ge $bounds.height){throw 'Point is outside captured target'}
      $old=[Drawing.Bitmap]::FromFile($snapshot.imagePath);$current=New-Object Drawing.Bitmap($bounds.width,$bounds.height);$g=[Drawing.Graphics]::FromImage($current)
      try{
        $g.CopyFromScreen($bounds.left,$bounds.top,0,0,$current.Size)
        $changed=0;$samples=0
        for($row=-3;$row -le 3;$row++){for($col=-5;$col -le 5;$col++){
          $px=[Math]::Min($bounds.width-1,[Math]::Max(0,$x+$col*6));$py=[Math]::Min($bounds.height-1,[Math]::Max(0,$y+$row*6))
          $a=$old.GetPixel($px,$py);$b=$current.GetPixel($px,$py)
          if(([Math]::Abs([int]$a.R-[int]$b.R)+[Math]::Abs([int]$a.G-[int]$b.G)+[Math]::Abs([int]$a.B-[int]$b.B)) -gt 90){$changed++};$samples++
        }}
        if($changed/[double]$samples -gt 0.04){throw 'Target pixels changed since capture; reobserve'}
      }finally{$g.Dispose();$current.Dispose();$old.Dispose()}
      $point=New-Object StudioDesktop+POINT;$point.X=$bounds.left+$x;$point.Y=$bounds.top+$y
      if([StudioDesktop]::GetAncestor([StudioDesktop]::WindowFromPoint($point),2) -ne [IntPtr]([long]$request.scope.windowHandle)){throw 'Point is occluded by another window'}
      if((Get-Tick) -ne $snapshot.lastInputTick){throw 'Input occurred before cursor movement; reobserve'}
      if(-not [StudioDesktop]::SetCursorPos($point.X,$point.Y)){throw 'Cursor positioning failed'}
      $cursorMoved=$true
      $physical=New-Object StudioDesktop+POINT
      if(-not [StudioDesktop]::GetPhysicalCursorPos([ref]$physical) -or $physical.X -ne $point.X -or $physical.Y -ne $point.Y){throw 'Physical cursor does not match target pixels'}
      $after=Get-Bounds
      if(($bounds|ConvertTo-Json -Compress) -ne ($after|ConvertTo-Json -Compress)){throw 'Window moved before input'}
      if((Get-Tick) -ne $snapshot.lastInputTick){throw 'Input occurred before mouse button/wheel input; reobserve'}
      if([StudioDesktop]::GetAncestor([StudioDesktop]::WindowFromPoint($point),2) -ne [IntPtr]([long]$request.scope.windowHandle)){throw 'Point became occluded before input'}
      if($request.action -eq 'click'){
        [StudioDesktop]::mouse_event(2,0,0,0,[UIntPtr]::Zero);$inputSent=$true
        [StudioDesktop]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
      }else{
        $delta=[int]$request.delta;if($delta -eq 0 -or [Math]::Abs($delta) -gt 720){throw 'Invalid scroll amount'}
        $data=[BitConverter]::ToUInt32([BitConverter]::GetBytes($delta),0)
        [StudioDesktop]::mouse_event(0x0800,0,0,$data,[UIntPtr]::Zero);$inputSent=$true
      }
      $result.inputSent=$true;$result.cursorMoved=$cursorMoved;$result.refreshRequired=$true;$result.point=@($x,$y)
    }
  }
  if($oldDpi -ne [IntPtr]::Zero){[void][StudioDesktop]::SetThreadDpiAwarenessContext($oldDpi)}
  $result|ConvertTo-Json -Depth 12 -Compress
}catch{
  [ordered]@{ok=$false;error=$_.Exception.Message;inputSent=$inputSent;cursorMoved=$cursorMoved;reobserveRequired=$true}|ConvertTo-Json -Compress
  exit 1
}
