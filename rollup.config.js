
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import buble from '@rollup/plugin-buble';
import scss from 'rollup-plugin-scss';
import {terser} from 'rollup-plugin-terser';
import {version} from './package.json';

const widgetName = 'TagTip';
const year = new Date().getFullYear();

const banner = `
/*!
 * ${widgetName} ${version}
 * (c) ${year} sjaakpriester.nl
 */
`;

const outro = `exports.version = '${version}';`;

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/tagtip.js',
        format: 'esm',
        // format: 'iife',
        name: widgetName,
        sourcemap: true,
        globals: {
      //      lodash: '_'
        },
        banner: banner,
        // outro: outro,
      //  extend: true
    },
    plugins: [
        resolve({
            customResolveOptions: {
                moduleDirectories: ['node_modules']
            }
        }),
        commonjs(),
        json(),
        scss({
            insert: true,
            outputStyle: "compressed",
            // sourceMap: true
        }),
/*
        buble({
             transforms: {
                 modules: false,
                 dangerousForOf: true,
                 dangerousTaggedTemplateString: true
             }
        }),

        terser({
            output: {
                comments: /^!/
            }
        })
*/
    ],
    external: [
 //       'lodash'
    ]
};
