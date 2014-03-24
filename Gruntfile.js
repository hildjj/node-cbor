module.exports = function(grunt) {
  // Load Grunt tasks declared in the package.json file
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      all: ['coverage', 'doc', 'lib', 'man'],
      coverage: ['coverage'],
      doc: ['doc'],
      lib: ['lib'],
      man: ['man'],
    },
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
    codo: {
      options: {}
    },
    coffeelint: {
      src: ['src/*.coffee'],
      options: {
        configFile: 'coffeelint.json'
      }
    },
    coveralls: {
      all: {
        src: 'coverage/lcov.info'
      }
    },
    markedman: {
      options: {
        version: '<%= pkg.version %>',
        section: '3'
      },
      bin: {
        files: [
          {
            expand: true,
            cwd: 'man_src',
            src: '*.md',
            dest: 'man',
            ext: '.1'
          }
        ]
      }
    },
    nodeunit: {
      all: ['test']
    },
    shell: {
      istanbul: {
        command: 'istanbul cover nodeunit test'
      },
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
    },
    release: {
      options: {
        tagName: 'v<%= version %>', //default: '<%= version %>'
      }
    }
  });

  grunt.registerTask('default', ['test']);
  grunt.registerTask('prepublish', ['clean', 'coffee', 'codo', 'markedman']);
  grunt.registerTask('man', ['clean:man', 'markedman'])
  grunt.registerTask('doc', ['clean:doc', 'codo', 'clean:man', 'markedman']);
  grunt.registerTask('test', ['coffee', 'nodeunit']);
  grunt.registerTask('server', ['test', 'shell:istanbul', 'express', 'watch']);
  grunt.registerTask('ci', ['test', 'shell:istanbul', 'coveralls']);
};
