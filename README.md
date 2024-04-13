# Status: **!!! DEPRECATED !!!**

This module is deprecated and no longer maintained.

# karma-virtualbox-edge-launcher

**A Karma launcher for Edge on VirtualBox.**

The `karma-virtualbox-edge-launcher` can be used to run karma tests on Microsoft Edge. It requires
one the [official virtual machines](https://developer.microsoft.com/en-us/microsoft-edge/tools/vms/)
provided by Microsoft which runs on VirtualBox.

## Installation

You can install the `karma-virtualbox-edge-launcher` via npm:

```shell
npm install karma-virtualbox-edge-launcher --save-dev
```

## Usage

To run tests on Microsoft Edge Karma can be configured like that:

```js
// ...
browsers: [
    'VirtualBoxEdge14'
],
// ...
customLaunchers: {
    VirtualBoxEdge14: {
        base: 'VirtualBoxEdge',
        keepAlive: true,
        snapshot: 'pristine',
        uuid: '66975e0d-14f7-4d79-7b8b-b3f6496f0a14'
    }
}
// ...
```

In case you want to know the uuids of your vms, you can run `VBoxManage list vms` to get the list of
available vms.

If you explicitly specify the plugins in your config file as well, make sure to add
`karma-virtualbox-edge-launcher` to the list of plugins.

```js
// ...
plugins: [
    // ...
    'karma-virtualbox-edge-launcher'
];
// ...
```

You may also want to increase the `captureTimeout` of Karma, if your VM takes very long to boot.

## Options

### keepAlive

If `true` the virtual machine will not be shut down after the tests.

### snapshot

An optional snapshot to which the virtual machine gets reset before starting it.

### uuid

The uuid of the virtual machine.
