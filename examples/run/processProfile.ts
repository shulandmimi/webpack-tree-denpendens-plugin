import PrefixTree, { TreeNode } from '@webpack-tree-denpendens-plugin/core/analyti';

interface ActionOfCreateParams {
    child: string;
    parent: string;
}
interface ActionOfAppendParams<T> extends ActionOfCreateParams {
    parentNode: T;
    childNode: T;
}

interface Actions {
    create: (option: ActionOfAppendParams<any>) => any;
    append: (option: ActionOfAppendParams<any>) => any;
}

interface ModuleMeta {
    modulePath: string;
    moduleEntry: string;
}
type ModuleItem = [moduleName: string, moduleMeta: ModuleMeta];

type DenpendensTree = {
    [filename: string]: string[];
};

interface ProfileStruct {
    prefixTree: TreeNode['children'];
    denpendensTree: DenpendensTree;
    modules: ModuleItem[];
}

export function transformProfile2denpendenTree(profiles: ProfileStruct, entry: string, actions: Actions) {
    const { denpendensTree, prefixTree: prefixTreeJSON, modules } = profiles || {};
    const entryNode = actions.create({ parent: entry, child: '入口', parentNode: null, childNode: null });
    if (!denpendensTree) return entryNode;
    const prefixTree = PrefixTree.fromJSON(prefixTreeJSON);
    const modulesValueMap = modules.reduce((result, module) => {
        const [name, meta] = module;
        result.set(meta.moduleEntry, {
            ...meta,
            name,
        });
        return result;
    }, new Map());

    const stopWhenMetaModule = (node: TreeNode) => {
        if (Object.prototype.hasOwnProperty.call(node.meta, 'module')) {
            return node.meta.module === true;
        } else {
            return false;
        }
    };

    const stacks = [entry];
    const rootTree = new Map();
    rootTree.set(entry, entryNode);

    const circleMap = new Map();
    while (stacks.length) {
        const parent = stacks.shift()!;
        const parentNode = prefixTree.query(parent, stopWhenMetaModule);
        const children = denpendensTree[parent] || [];
        const root = rootTree.get(parent);

        for (const child of children) {
            const childNode = prefixTree.query(child, stopWhenMetaModule);
            if (childNode?.meta?.module === true && !modulesValueMap.has(child)) {
                continue;
            }
            if (!Object.prototype.hasOwnProperty.call(rootTree, child)) {
                rootTree.set(child, actions.create({ parent, child, parentNode, childNode }));
            }
            if (circleMap.has(`${parent}-${child}`) || circleMap.has(`${child}-${parent}`)) {
                continue;
            }
            circleMap.set(`${parent}-${child}`, true);

            actions.append({ child, parent, parentNode: root, childNode: rootTree.get(child) });
            stacks.push(child);
        }
    }

    return rootTree.get(entry);
}

export function transformProfile2Graph(profiles: ProfileStruct, entry: string, actions: Actions, moduleNode?: TreeNode) {
    const { denpendensTree, prefixTree: prefixTreeJSON, modules } = profiles || {};
    const entryNode = actions.create({ parent: entry, child: '入口', parentNode: null, childNode: null });
    if (!denpendensTree) return entryNode;
    const prefixTree = PrefixTree.fromJSON(prefixTreeJSON);
    const modulesValueMap = modules.reduce((result, module) => {
        const [name, meta] = module;
        result.set(meta.moduleEntry, {
            ...meta,
            name,
        });
        return result;
    }, new Map());

    const stopWhenMetaModule = (node: TreeNode) => {

        if (moduleNode && (moduleNode?.fullname === node.fullname)) {
            return false;
        }
        if (Object.prototype.hasOwnProperty.call(node.meta, 'module')) {
            return node.meta.module === true;
        } else {
            return false;
        }
    };

    const stacks = [entry];
    const rootTree = new Map();
    rootTree.set(entry, entryNode);
    const graph: { from: string; to: string }[] = [];

    const circleMap = new Map();
    while (stacks.length) {
        const parent = stacks.shift()!;
        const parentNode = prefixTree.query(parent, stopWhenMetaModule);
        const children = denpendensTree[parent] || [];
        const root = rootTree.get(parent);

        for (const child of children) {
            const childNode = prefixTree.query(child, stopWhenMetaModule);
            if (childNode?.meta?.module === true && !modulesValueMap.has(child)) {
                continue;
            }

            if (!Object.prototype.hasOwnProperty.call(rootTree, child)) {
                rootTree.set(child, actions.create({ parent, child, parentNode, childNode }));
            }

            if (circleMap.has(`${parent}-${child}`) || circleMap.has(`${child}-${parent}`)) {
                continue;
            }

            circleMap.set(`${parent}-${child}`, true);

            graph.push(actions.append({ child, parent, parentNode: root, childNode: rootTree.get(child) }));

            stacks.push(child);
        }
    }

    return {
        nodes: [...rootTree.values()],
        graph: graph,
    };
}
