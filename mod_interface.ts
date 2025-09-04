export const enum NodeType{
    Mod,Package
}

export interface MNode{
    type:NodeType,
    id:string
    version:string,

    name:string,
}

export interface ModNode extends MNode{
    packageVersion:string, // the game version
    author:string,
    mod_deps:Array<{
        versionRange:string,
        version:string,
        id:string,
        qmod_url?:string
    }>
}

export interface PackageNode extends MNode{
    linkedMod?:ModNode,
    pkg_deps:Array<{
        versionRange:string,
        version:string,
        id:string,

        qmod_url?:string

        includeQmod?:boolean,
        private?:boolean
    }>
}

export interface Dependency{
    node:MNode
    //additional data?
    additionalData:{
        includeQmod?:boolean,
        private?:boolean
    }
}
