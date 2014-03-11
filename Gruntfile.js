module.exports = function(grunt) {
  // Load Grunt tasks declared in the package.json file
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

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
      },
      doc: {
        command: 'codo',
        options: {
          stdout: true
        }
      }
    },
    express: {
      all: {
        options: {
          port: 9000,
          hostname: "0.0.0.0",
          bases: 'coverage/lcov-report',
          livereload: true,
          open: 'http://localhost:<%= express.all.options.port%>/lib'
        }
      }
    },
    watch: {
      all: {
        files: ['src/*.coffee', 'test/*.js'],
        tasks: ['test', 'shell:istanbul'],
        options: {
          livereload: true
        }
      }
    }
  });


  grunt.registerTask('default', ['test']);
  grunt.registerTask('doc', ['shell:doc']);
  grunt.registerTask('test', ['coffee', 'nodeunit']);
  grunt.registerTask('server', ['express', 'watch']);
  grunt.registerTask('ci', ['test', 'shell:istanbul', 'coveralls']);
};
