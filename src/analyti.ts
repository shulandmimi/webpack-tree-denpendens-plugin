const has = (obj: any, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

const mutipleTree = {
    '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/index.js': {},
    'src/index.js': {},
};

// /home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/auth/digest.js
// prefix: '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/'
// suffix: 'qiniu/auth/digest.js'
const mutipleTree1 = {
    '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/': {
        'index.js': {},
        'qiniu/auth/digest.js': {},
    },
    'src/index.js': {},
};

// /home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/lodash@4.17.21/node_modules/lodash/lodash.js
// prefix : '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/'
const mutipleTree2 = {
    '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/': {
        'lodash@4.17.21/node_modules/lodash/lodash.js': {},
        'qiniu@7.6.0/node_modules/qiniu/': {
            'index.js': {},
            'qiniu/auth/digest.js': {},
        },
    },
    'src/index.js': {},
};

// type TreeNode = {
//     children: { [key: string]: TreeNode };
//     prefix: string;
// };

export interface TreeNode {
    meta: {
        [key: string]: any;
    };
    children: { [key: string]: TreeNode };
    prefix: string;
    fullname: string;
}

function createTreeNode(children: TreeNode['children'], prefix: string, fullname: string = prefix): TreeNode {
    return {
        meta: {},
        children: children || {},
        prefix,
        fullname,
    };
}

const trimEndSep = (filename: string) =>
    filename.length !== 0 ? (filename[filename.length - 1] === '/' ? filename.substring(0, filename.length - 1) : filename) : filename;

export default class PrefixTree {
    root: TreeNode['children'] = {};

    insert(name: string): null | TreeNode {
        function matchPrefix(node: TreeNode['children'], filename: string, fullname: string): null | TreeNode {
            const [endIndex, prefixs] = maxPrefix(Object.keys(node), filename);
            const [prefix, suffix] = [filename.slice(0, endIndex), filename.slice(endIndex)];

            // 全匹配，路径存在
            if (prefix === filename) {
                return null;
            }
            // prefix 作为key存在，递归
            if (has(node, prefix) || has(node, trimEndSep(prefix))) {
                return matchPrefix((node[prefix] || node[trimEndSep(prefix)]).children, suffix, fullname);
            } else if (endIndex === 0) {
                return (node[trimEndSep(filename)] = createTreeNode({}, filename, fullname));
            } else {
                if (has(node, suffix)) {
                    return null;
                }
                const nodes = prefixs.reduce((result, prefix) => {
                    node[prefix].prefix = prefix.slice(endIndex);
                    return { ...result, [prefix.slice(endIndex)]: node[prefix] };
                }, {}) as TreeNode['children'];
                prefixs.forEach(prefix => Reflect.deleteProperty(node, prefix));
                const newNode = createTreeNode({}, suffix, fullname);
                node[prefix] = createTreeNode(
                    {
                        ...nodes,
                        [trimEndSep(suffix)]: newNode,
                    },
                    prefix
                );
                return newNode;
            }
        }

        return matchPrefix(this.root, name, name);
    }

    query(name: string, find: (node: TreeNode) => boolean = () => false) {
        const findNode = (node: TreeNode | null) => (node ? find(node) : false);
        function matchPrefix(node: TreeNode['children'], filename: string): TreeNode | null {
            const [endIndex, prefixs] = maxPrefix(Object.keys(node), filename);
            const [prefix, suffix] = [filename.slice(0, endIndex), filename.slice(endIndex)];

            if (!suffix) {
                // xyz/
                // xyz
                return node[prefix] || node[trimEndSep(prefix)] || node[prefix + '/'];
            }

            // prefix 作为key存在，递归
            if (has(node, prefix) || has(node, trimEndSep(prefix))) {
                const matchNode = node[prefix] || node[trimEndSep(prefix)];
                if (findNode(matchNode)) {
                    return matchNode;
                }
                return matchPrefix((node[prefix] || node[trimEndSep(prefix)]).children, suffix);
            }
            if (has(node, suffix)) {
                return node[suffix];
            }

            return null;
        }
        return matchPrefix(this.root, name);
    }

    toString(): string {
        return JSON.stringify(this.root);
    }

    toJSON(): TreeNode['children'] {
        return this.root;
    }

    traverse(callback: (node: TreeNode) => TreeNode | void) {
        const root = this.root;

        function postTraverse(root: TreeNode) {
            for (const key in root.children) {
                postTraverse(root.children[key]);
            }
            callback(root);
        }

        for (const key in root) {
            postTraverse(root[key]);
        }
    }

    static fromText(content: string): PrefixTree {
        const datas = JSON.parse(content) as TreeNode['children'];
        const prefixTree = new PrefixTree();
        prefixTree.root = datas;
        return prefixTree;
    }
    static fromJSON(content: TreeNode['children']): PrefixTree {
        const prefixTree = new PrefixTree();
        prefixTree.root = content;
        return prefixTree;
    }
}

function maxPrefix(strings: string[], string: string): [number, string[]] {
    const len = strings.length;
    const formatStrings = strings.map(item => item.split('/'));
    const formatString = string.split('/');
    let max = formatString.length;
    const prefixList = [];
    let allZero = 0;

    // 无匹配项
    if (len === 0) return [0, []];

    for (let i = 0; i < len; i++) {
        // 根据匹配最小规则
        const compareLen = Math.min(formatStrings[i].length, max);
        let j;
        for (j = 0; j < compareLen; j++) {
            if (formatString[j] !== formatStrings[i][j]) {
                // 全不匹配，记录但不归 0
                if (j === 0) {
                    allZero++;
                    break;
                }
                // 记录
                max = j;
                prefixList.push(strings[i]);
                break;
            }
        }

        // 全匹配
        if (j === compareLen) {
            max = j;
            prefixList.push(strings[i]);
        }
    }

    // 全部为零，无匹配规则，返回 0
    if (allZero === len) return [0, []];
    // 根据 / 分割，需要 + 1
    // 有可能以 /xx/yy 结尾，所以取 min(/xx/yy.len, max + 1)
    return [Math.min(formatString.slice(0, max).join('/').length + 1, string.length), prefixList];
}

// var s = '/home/shulan/123';
// var [result] = maxPrefix(['/home/shulan/abc', '/home/shulan/abd'], s);

// assert.equal(result, 13);
// assert.equal(s.slice(0, result), '/home/shulan/');

// var s = '/home/shupi/123';
// var [result] = maxPrefix(['/home/shulan/abc', '/home/shulan/abd'], s);

// assert.equal(result, '/home/'.length);
// assert.equal(s.slice(0, result), '/home/');

// var s = '/home';
// var [result] = maxPrefix(['/home/shulan/abc', '/home/shulan/abd'], s);

// assert.equal(result, '/home'.length);
// assert.equal(s.slice(0, result), '/home');

// var s = '/home/shulan';
// var [result] = maxPrefix(['/home/shulan/abc', '/home/shulan/abd', 'src/123.ts'], s);

// assert.equal(result, '/home/shulan'.length);
// assert.equal(s.slice(0, result), '/home/shulan');

// const prefixTree = new PrefixTree();
// prefixTree.insert(
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/index.js'
// );
// prefixTree.insert('src/index.js');

// prefixTree.insert(
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/auth/digest.js'
// );

// prefixTree.insert(
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/cdn.js'
// );

// console.log(JSON.stringify(prefixTree, null, 4));

// [
//     'index.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/storage/form.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/storage/form.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/storage/form.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/storage/form.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/storage/form.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/storage/resume.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/storage/rs.js',
//     // '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/qiniu@7.6.0/node_modules/qiniu/qiniu/fop.js',
// ].forEach(filename => prefixTree.insert(filename));

// [
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/examples/run/index.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/examples/run/src/a.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/examples/run/src/c.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/examples/run/src/c.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/examples/run/src/b.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/examples/run/src/c.js',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/lodash@4.17.21/node_modules/lodash',
//     '/home/shulan/work/javascript/lang/source/webpack/webpack-tree-denpendens-plugin/node_modules/.pnpm/lodash@4.17.21/node_modules/lodash/lodash.js',
// ].forEach(filename => prefixTree.insert(filename));

// console.log(JSON.stringify(prefixTree.root, null, 4));

// prefixTree.insert('/1/2/3');
// prefixTree.insert('/2/3/4');
// prefixTree.insert('/2/3/3');

// console.log(JSON.stringify(prefixTree.root, null, 4));
// console.log(JSON.stringify(prefixTree.query('/2/3/3'), null, 4));
// console.log(JSON.stringify(prefixTree.query('/2/3'), null, 4));
// console.log(JSON.stringify(prefixTree.query('/2/3/4')));
