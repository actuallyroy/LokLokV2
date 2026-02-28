import subprocess
import os
import datetime

def take_adb_screenshot(save_dir="./screenshots/", filename=None):
    # Generate a filename with timestamp if not provided
    if filename is None:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{timestamp}.png"
    # Ensure the save directory exists
    os.makedirs(save_dir, exist_ok=True)
    local_path = os.path.join(save_dir, filename)
    device_path = "/sdcard/screen_temp.png"

    try:
        # Take screenshot on device
        subprocess.run(["adb", "shell", "screencap", "-p", device_path], check=True)
        # Pull screenshot to local machine
        subprocess.run(["adb", "pull", device_path, local_path], check=True)
        # Remove screenshot from device
        subprocess.run(["adb", "shell", "rm", device_path], check=True)
        full_path = os.path.abspath(local_path)
        print(f"Screenshot saved to {full_path}")
    except subprocess.CalledProcessError as e:
        print("Error taking screenshot:", e)

if __name__ == "__main__":
    take_adb_screenshot()