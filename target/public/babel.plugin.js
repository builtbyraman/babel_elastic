(()=>{
  var __modules__ = {
    0: function(mod, exports) {
      exports.__esModule = true;
      exports.plugin = function(initializerContext) {
        return {
          setup: function(core) {
            core.application.register({
              id: 'babel',
              title: 'Babel',
              euiIconType: 'globe',
              order: 9500,
              category: { id: 'kibana', label: 'Analytics', order: 1000, euiIconType: 'logoKibana' },
              visibleIn: ['globalSearch', 'sideNav', 'kibanaOverview'],
              defaultPath: '/',
              mount: function(params) {
                var el = params.element;
                el.style.cssText = 'height:100%;overflow:hidden;';
                var iframe = document.createElement('iframe');
                iframe.src = '/api/babel/app';
                iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
                el.appendChild(iframe);
                return function() { el.innerHTML = ''; };
              }
            });
          },
          start: function() {},
          stop: function() {}
        };
      };
    }
  };

  var __require__ = function(id) {
    var mod = { exports: {} };
    __modules__[id](mod, mod.exports, __require__);
    return mod.exports;
  };

  __kbnBundles__.define('plugin/babel/public', __require__, 0);
})();
