"""Windows directory enumeration with native identity and reparse-point checks."""
import ctypes
from ctypes import wintypes
import os
from pathlib import Path


class FileInfo(ctypes.Structure):
    _fields_ = [
        ('attributes', wintypes.DWORD), ('creation', wintypes.FILETIME),
        ('access', wintypes.FILETIME), ('write', wintypes.FILETIME),
        ('volume', wintypes.DWORD), ('size_high', wintypes.DWORD),
        ('size_low', wintypes.DWORD), ('links', wintypes.DWORD),
        ('index_high', wintypes.DWORD), ('index_low', wintypes.DWORD),
    ]


def list_locked_directory(root: Path, path: Path, before):
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    create = kernel.CreateFileW
    create.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                       wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
    create.restype = wintypes.HANDLE
    info = kernel.GetFileInformationByHandle
    info.argtypes = [wintypes.HANDLE, ctypes.POINTER(FileInfo)]
    info.restype = wintypes.BOOL
    close = kernel.CloseHandle
    close.argtypes = [wintypes.HANDLE]
    close.restype = wintypes.BOOL
    handles = []
    identities = []
    relative = path.relative_to(root)
    components = [root]
    for part in relative.parts:
        components.append(components[-1] / part)
    try:
        for directory in components:
            handle = create(str(directory), 0x80, 0x1 | 0x2, None, 3,
                            0x02000000 | 0x00200000, None)
            if handle == ctypes.c_void_p(-1).value:
                raise ctypes.WinError(ctypes.get_last_error())
            handles.append(handle)
            record = FileInfo()
            if not info(handle, ctypes.byref(record)):
                raise ctypes.WinError(ctypes.get_last_error())
            if not record.attributes & 0x10 or record.attributes & 0x400:
                raise ValueError('directory is not real or is a reparse point')
            current = directory.lstat()
            inode = record.index_high << 32 | record.index_low
            if current.st_ino != inode:
                raise ValueError('directory identity changed')
            identities.append((directory, current.st_dev, current.st_ino))
        current = path.lstat()
        if (current.st_dev, current.st_ino) != (before.st_dev, before.st_ino):
            raise ValueError('directory changed before locking')
        names = sorted(os.listdir(path))
        # Some Windows filesystems permit ancestor renames despite open handles.
        # Recheck the entire pinned path, not just the final directory.
        for directory, device, inode in identities:
            current = directory.lstat()
            if (current.st_dev, current.st_ino) != (device, inode) or getattr(current, 'st_file_attributes', 0) & 0x400:
                raise ValueError('directory ancestry changed while enumerating')
        after = path.lstat()
        if (after.st_dev, after.st_ino) != (before.st_dev, before.st_ino):
            raise ValueError('directory changed while enumerating')
        return names
    finally:
        for handle in reversed(handles):
            close(handle)
