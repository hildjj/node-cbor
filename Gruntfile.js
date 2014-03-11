module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    coffee: {
      compile: {
        expand: true,
        flatten: true,
        cwd: 'src',
        src: ['*.coffee'],
        dest: 'lib/',
        ext: '.js'
      }
    },
    coveralls: {
      all: {
        src: 'coverage/lcov.info'
      }
    },
    nodeunit: {
      all: ['test']
    },
    shell: {
      istanbul: {
        command: 'istanbul cover nodeunit test'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-coveralls');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('default', ['test']);
  grunt.registerTask('test', ['coffee', 'nodeunit']);
  grunt.registerTask('ci', ['test', 'shell:istanbul', 'coveralls']);
};
