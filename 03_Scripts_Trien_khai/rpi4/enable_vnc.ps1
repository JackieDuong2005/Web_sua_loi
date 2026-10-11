# PowerShell launcher to enable VNC on Raspberry Pi
param (
    [string]$Password
)

if (-not $Password) {
    $Password = Read-Host "Nhập mật khẩu cho tài khoản jackie@192.168.1.56" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
} else {
    $PlainPassword = $Password
}

python "c:\Users\Jackie Duong\Desktop\Web_sua_loi\03_Scripts_Trien_khai\rpi4\enable_vnc.py" "$PlainPassword"
