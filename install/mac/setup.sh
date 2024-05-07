mkdir install/node
curl -o install/node/node_mac.tar.gz https://nodejs.org/dist/v20.0.0/node-v20.0.0-darwin-x64.tar.gz
tar -xzf install/node/node_mac.tar.gz -C install/node --strip-components=1
chmod +x install/node/bin/*
chmod +x ./install/mac/env.sh

