import { Database } from "./database"
import { MNode, ModNode, NodeType } from "./mod_interface"

interface BMAuthor{
    id:number,username:string,displayName:string
}

interface BMMod {
    id:number,
    name:string,
    authors:BMAuthor[],
    category:string,
}

interface BMLatest{
    id:number,modId:number,author:BMAuthor[],modVersion:string,
    dependencies:number[]
}

interface BMModItem{
    mod:BMMod,
    latest:BMLatest

}
interface BMVersionManifest{
    mods:BMModItem[]
}

export function assignBeatModsToDatabase(db:Database, json:BMVersionManifest){

    let mod_by_id = new Map<number, BMModItem>()
    for(let mod of json.mods){
        mod_by_id.set(mod.latest.id, mod)
    }

    db.items = []

    for(let mod of json.mods){

        let author = ""
        for(let auth of mod.mod.authors){
            if(author != "") author += ","
            author += auth.displayName
        }

        let deps:{
            versionRange:string,
            version:string,
            id:string,
            qmod_url?:string
        }[] = []

        for(let dep of mod.latest.dependencies){
            let item = mod_by_id.get(dep)
            if(item == undefined || item == null)
                continue
            deps.push({
                versionRange: "^" + item.latest.modVersion,
                version: item.latest.modVersion,
                id: dep.toString(),
            })
        }


        let mnode:ModNode = {
            // type: mod.mod.category == "library" ? NodeType.Package : NodeType.Mod
            type: NodeType.Mod, // PC mod has no library, they are all dlls
            id: mod.latest.id.toString(),
            version: mod.latest.modVersion,
            name: mod.mod.name,
            packageVersion: "ignore",
            author: author,
            mod_deps: deps
        }
        db.items.push({
            url : "https://beatmods.com/mods/" + mod.mod.id,
            item: mnode
        })
    }
}