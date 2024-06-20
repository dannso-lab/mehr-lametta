const concurrently = require('concurrently');
const path = require('path')

const basepath = path.normalize(path.join(__dirname, '..'))

concurrently(
  [
    {
      command: 'make run-local',
      cwd: path.join(basepath, 'dashboard'),
      name: 'dashboard'
    },
    {
      command: 'make run-local',
      cwd: path.join(basepath, 'backend'),
      name: 'backend'
    }
  ],
);