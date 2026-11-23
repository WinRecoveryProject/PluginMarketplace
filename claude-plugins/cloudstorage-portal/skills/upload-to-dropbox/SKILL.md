---
name: upload-to-dropbox
description: "Use when the user wants to save text from this conversation, such as notes, a report or code, as a new file in Dropbox through the Dropbox connector."
---
# Save to Dropbox (Claude)

The Dropbox connector in Claude creates text files with `create_file`. It does
not upload local or binary files and does not overwrite existing files.

1. Confirm the destination folder and file name. Use `list_folder` or
   `get_file_metadata` to check that the folder exists and the name is free.
   Create the folder with `create_folder` only when the user asked for it.
2. Call `create_file` with the exact text. Do not add content the user did not
   ask for.
3. Read back the new file's metadata with `get_file_metadata` and report the
   path, size and ID. Report the file as saved only after that readback.
4. If the name is taken, ask whether to use another name. Never delete or
   replace the existing file to make room.
5. Binary files, images and files from the user's computer cannot be saved
   this way. Say so and suggest the Dropbox web or desktop app.
