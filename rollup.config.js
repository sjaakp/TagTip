
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
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
        name: widgetName,
        sourcemap: true,
        globals: {
      //      lodash: '_'
        },
        banner: banner,
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
        terser({
            output: {
                comments: /^!/
            }
        })
*/
    ],
    external: [
    ]
};
