module.exports = function(grunt) {
  // Load Grunt tasks declared in the package.json file
  require('jit-grunt')(grunt);

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
      options: {
        sourceMap: true
      },
      compile: {
        expand: true,
        flatten: true,
        cwd: 'src',
        src: ['*.coffee'],
        dest: 'lib/',
        ext: '.js'
      }
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
        tasks: ['cover'],
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
  grunt.registerTask('prepublish', ['clean', 'coffee', 'markedman']);
  grunt.registerTask('man', ['clean:man', 'markedman'])
  grunt.registerTask('doc', ['clean:doc', 'clean:man', 'markedman']);
  grunt.registerTask('test', ['coffee', 'nodeunit']);
  grunt.registerTask('cover', ['coffee', 'shell:istanbul']);
  grunt.registerTask('server', ['cover', 'express', 'watch']);
  grunt.registerTask('ci', ['test', 'shell:istanbul', 'coveralls']);
};
