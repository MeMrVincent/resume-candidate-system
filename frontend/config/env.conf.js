const envConfig = {
  process: {
    host: '0.0.0.0',
    port: 9000,
    filename: 'index.html',
    title: 'Recruitment CRM / ATS - Frontend',
    sysApp: 'src',
    sysName: 'frontend',
    appVersion: '1.0.0',
    dev: {
      staticURL: './',
      apiURL: 'http://localhost:9000',
      dist: 'dev',
    },
    test: {
      staticURL: './',
      apiURL: 'http://localhost:9000',
      dist: 'test',
    },
    uat: {
      staticURL: './',
      apiURL: 'http://localhost:9000',
      dist: 'uat',
    },
    prod: {
      staticURL: './',
      apiURL: 'http://localhost:9000',
      dist: 'prod',
    },
  },

  getNodeENV(obj) {
    return this.getENV('node', obj, this.process);
  },

  getBuildENV(obj) {
    return this.getENV('build', obj, this.process);
  },

  getENV(type, obj, params) {
    let item;
    for (let x in params) {
      item = params[x];
      if (typeof item === 'object' && x === (obj.prod ? JSON.parse(obj.prod) : 'dev')) {
        this.getENV(type, obj, item);
      }
      if (typeof item !== 'object') {
        if (type === 'node') {
          obj[x] = '"' + item + '"';
        }
        if (type === 'build') {
          obj[x] = item;
        }
      }
    }
    return obj;
  },
};

module.exports = envConfig;
