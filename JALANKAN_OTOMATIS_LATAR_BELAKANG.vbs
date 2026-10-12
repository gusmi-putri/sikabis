Set WshShell = CreateObject("WScript.Shell")
' Jalankan JALANKAN_SIJAGA.bat tanpa memunculkan jendela hitam sama sekali (0 = hide)
WshShell.Run chr(34) & "JALANKAN_SIJAGA.bat" & Chr(34), 0
Set WshShell = Nothing
