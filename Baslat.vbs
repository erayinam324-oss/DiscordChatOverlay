' Baslatici: konsol penceresi acmadan katmani baslatir.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = dir & "\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(exe) Then
  MsgBox "Electron bulunamadi. Once KUR.bat dosyasini calistir.", 48, "Chat Katmani"
  WScript.Quit
End If
sh.CurrentDirectory = dir
sh.Run """" & exe & """ "".""", 0, False
