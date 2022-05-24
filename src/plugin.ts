import { ChunkGraph, Compilation, Compiler, NormalModule, Stats, WebpackPluginInstance } from 'webpack';
import path from 'path';
import fs from 'fs';
import PrefixTree from './analyti';

const slash = (filename: string) => filename.split(path.sep).join(path.posix.sep);

interface Node {
    children: string[];
    size: number;
    [key: string]: any;
}

abstract class ModuleNode {
    public abstract name: string;
    public abstract fullpath: string;
}

function fetchRealPath() {}

class Module {
    constructor(public name: string, public dirname: string) {}

    static isModule(filename: string) {
        return !(
            filename.startsWith('/') ||
            filename.startsWith('../') ||
            filename.startsWith('./') ||
            filename.startsWith('.') ||
            filename.startsWith('..')
        );
    }

    static moduleName(filename: string) {
        const filenameList = slash(filename).split(path.posix.sep);
        if (/@/.test(filename)) {
            return filenameList.slice(0, 2).join(path.posix.sep);
        }

        if (!/\//.test(filename)) {
            return filename;
        }
        const name = filenameList.shift()!;
        return Module.isModule(name) ? name : null;
    }

    static removeRoot(filename: string, paths: string[]) {
        paths.sort((a, b) => (a.length < b.length ? 1 : -1));
        for (const path of paths) {
            if (filename.startsWith(path)) {
                return filename.substring(path.length);
            }
        }
        return filename;
    }

    static getPathByModuleName(moduleName: string, fullname: string): null | string {
        const fullnamaeList = slash(fullname).split(path.posix.sep);
        const start = fullnamaeList.indexOf(moduleName);
        return start === -1 ? null : fullnamaeList.slice(0, start).join(path.posix.sep);
    }
}

export default class WebpackTreeDenpendensPlugin implements WebpackPluginInstance {
    constructor() {}

    apply(compiler: Compiler) {
        const map = new Map<string, string[]>();
        const modules = new Map();
        const prefixTree = new PrefixTree();
        compiler.hooks.normalModuleFactory.tap(PluginName, normalModule => {
            normalModule.hooks.afterResolve.tap(PluginName, resolveData => {
                const parent = resolveData.contextInfo.issuer;
                const from = resolveData.createData.request!;
                if (Module.isModule(resolveData.request)) {
                    const modulePathLink = resolveData.createData.resourceResolveData?.descriptionFileRoot as string;
                    const moduleAbsolutePath = path.join(path.dirname(modulePathLink), fs.readlinkSync(modulePathLink));
                    if (!modules.has(resolveData.request)) {
                        modules.set(resolveData.request, {
                            modulePath: moduleAbsolutePath,
                            moduleEntry: from,
                        });
                        const node = prefixTree.insert(moduleAbsolutePath);
                        if (node !== null) {
                            node.meta = {
                                module: true,
                                moduleName: resolveData.request,
                            };
                        }
                    }
                }

                if (!map.has(parent)) {
                    map.set(parent, []);
                }

                map.get(parent)!.push(from);
                prefixTree.insert(from);
            });
        });
        compiler.hooks.afterDone.tap(PluginName, stats => {
            const list: { [key: string]: string[] } = {};
            map.forEach((val, key) => {
                list[key] = val;
            });

            prefixTree.traverse(node => {
                if (!node.meta) node.meta = {};
                const meta: { [key: string]: any } = {};
                let stats: null | fs.Stats = null;
                try {
                    stats = fs.statSync(node.fullname);
                } catch (error) {}

                const file = stats?.isFile() || false;

                if (node?.meta?.module === true || !file) {
                    Object.assign(meta, {
                        totalSize: Object.keys(node.children).reduce((result, filename) => {
                            return result + node.children[filename].meta.totalSize;
                        }, 0),
                    });
                } else {
                    const size = stats!.size;
                    Object.assign(meta, {
                        totalSize: size,
                        size: size,
                    });
                }

                Object.assign(node.meta, meta);
            });

            const profileDatas = {
                prefixTree: prefixTree.toJSON(),
                denpendensTree: list,
                modules: [...modules],
            };
            compiler.outputFileSystem.writeFile(path.join(compiler.outputPath, 'profile.json'), JSON.stringify(profileDatas), err => {
                if (err) throw err;
            });
        });

        compiler.hooks.compilation.tap(PluginName, compilation => {
            // compilation.hooks.afterOptimizeChunkAssets.tap(PluginName, chunks => {
            //     console.log(compilation.getAssets().map(item => item.source.size()));
            // });
            // compilation.hooks.processAssets.tap({ name: PluginName, stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER }, assets => {
            //     for (const index in assets) {
            //         const asset = assets[index];
            //     }
            // });
            // compilation.hooks.afterOptimizeChunks.tap(PluginName, chunks => {
            //     for(const chunk of chunks) {
            //         console.log(chunk.name)
            //         console.log(chunk.modulesSize());
            //     }
            // });
            // compilation.hooks.shouldRecord.tap(PluginName, () => {
            // console.log(chunks, modules);
            // })
        });
    }
}

const PluginName = WebpackTreeDenpendensPlugin.name;
