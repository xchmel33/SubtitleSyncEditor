param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("windows", "linux", "mac")]
    [string]$platform,

    [Parameter(Mandatory=$false)]
    [ValidateSet("run", "build")]
    [string]$action = "build"
)

function Build-Windows {
    pyinstaller --onefile --windowed ../src/app.py
}

function Run-Windows {
    Start-Process "../dist/app.exe"
}

function Build-LinuxOrMac {
    $ImageName = "subsynceditor"

    # Check if the Docker image already exists
    $ImageExists = docker images -q $ImageName 2>$null
    if (-not $ImageExists) {
      Write-Host "Image $ImageName does not exist. Building..."
      docker build -t $ImageName -f install/Dockerfile .
    } else {
      Write-Host "Image $ImageName already exists. Skipping build."
    }
#    docker run --rm -it -v ".:/subtitleeditor" $ImageName pyinstaller --onefile src/app.py
    docker run --rm -it -v ".:/subtitleeditor" $ImageName /bin/bash
}

function Run-LinuxOrMac {
    docker run --rm -it -v ".:/subtitleeditor" -e DISPLAY=host.docker.internal:0.0 -v /tmp/.X11-unix:/tmp/.X11-unix $ImageName /subtitleeditor/dist/app
}

switch ($platform) {
    "windows" {
        if ($action -eq "build") {
            Build-Windows
        } elseif ($action -eq "run") {
            Run-Windows
        }
    }
    "linux" {
        if ($action -eq "build") {
            Build-LinuxOrMac
        } elseif ($action -eq "run") {
            Run-LinuxOrMac
        }
    }
    "mac" {
        if ($action -eq "build") {
            Build-LinuxOrMac
        } elseif ($action -eq "run") {
            Run-LinuxOrMac
        }
    }
}

Write-Host "Process for $platform ($action) completed."
