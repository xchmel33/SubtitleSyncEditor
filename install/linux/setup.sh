mkdir install/node
curl -o install/node/node_linux.tar.xz https://nodejs.org/dist/v20.0.0/node-v20.0.0-linux-x64.tar.xz
tar -xJf install/node/node_linux.tar.xz -C install/node --strip-components=1
chmod +x install/node/bin/node
chmod +x ./install/linux/env.sh
