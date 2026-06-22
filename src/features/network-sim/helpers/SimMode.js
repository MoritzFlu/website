let _mode = 'none';
const _listeners = new Set();

export const getMode = () => _mode;

export const setMode = (mode) => {
    _mode = mode;
    _listeners.forEach(cb => cb(mode));
};

export const subscribe = (cb) => {
    _listeners.add(cb);
    return () => _listeners.delete(cb);
};

export const MODES = ['none', 'stp', 'arp', 'routing', 'dns', 'tcp'];
