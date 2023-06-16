import { Ref, ref } from "vue";
import { EditNote } from "./EditNote";
import { NumberDictionary } from "./Dictionary";

export class MaybeGroupedEditNote extends EditNote {
    group?: Group;
}

export class Group {
    name = "Unnamed group";
    id;
    _notes: MaybeGroupedEditNote[] = [];
    _groups: Group[] = [];
    memFlatNotes: MaybeGroupedEditNote[] | null = null;

    get notes(): EditNote[] {
        return this._notes;
    }

    set notes(value: MaybeGroupedEditNote[]) {
        this._notes = value;
        value.forEach(note => {
            note.group = this;
        });
        this.memFlatNotes = null;
    }

    get groups(): Group[] {
        return this._groups;
    }

    set groups(value: Group[]) {
        this._groups = value;
        this.memFlatNotes = null;
    }

    get bounds() {
        const returnValue = {
            start: Infinity,
            end: -Infinity,
            octaveStart: 0,
            octaveEnd: 12
        };
        this._notes.forEach(note => {
            if (note.start < returnValue.start) {
                returnValue.start = note.start;
            }
            if (note.end > returnValue.end) {
                returnValue.end = note.end;
            }
            if (note.octave < returnValue.octaveStart) {
                returnValue.octaveStart = note.octave;
            }
            if (note.octave > returnValue.octaveEnd) {
                returnValue.octaveEnd = note.octave;
            }
        });
        this._groups.forEach(({ bounds }) => {
            if (bounds.start < returnValue.start) {
                returnValue.start = bounds.start;
            }
            if (bounds.end > returnValue.end) {
                returnValue.end = bounds.end;
            }
            if (bounds.octaveStart < returnValue.octaveStart) {
                returnValue.octaveStart = bounds.octaveStart;
            }
            if (bounds.octaveEnd > returnValue.octaveEnd) {
                returnValue.octaveEnd = bounds.octaveEnd;
            }
        });
        return returnValue;
    }

    static list: NumberDictionary<Group> = {};

    static getUnusedId(): number {
        let id = 0;
        while (Group.list[id]) {
            id++;
        }
        return id;
    }

    static getOrCreateGroupById(id: number): Group {
        if (Group.list[id]) {
            return Group.list[id];
        }
        const newGroup = new Group();
        newGroup.id = id;
        Group.list[id] = newGroup;
        return newGroup;
    }

    static getFlatNotes(reutilize = false, group: Group): MaybeGroupedEditNote[] {
        if (group.memFlatNotes && reutilize) {
            return group.memFlatNotes;
        }
        const returnValue: MaybeGroupedEditNote[] = [];
        group.notes.forEach((note: MaybeGroupedEditNote) => {
            note.group = group;
            returnValue.push(note);
        });
        group.groups.forEach(subgroup => {
            returnValue.push(...subgroup.getFlatNotes());
        });
        group.memFlatNotes = returnValue;
        return returnValue;
    }

    static getParentOf = (item: (Group | EditNote)): Group | null => {
        const keys = Object.keys(Group.list) as unknown[] as number[];
        const containers: Group[] = [];
        keys.forEach((key: number) => {
            const g = Group.list[key];
            if (g.groups.includes(item as Group)) {
                containers.push(g);
            }
            if (g.notes.includes(item as EditNote)) {
                containers.push(g);
            }
        });
        if (containers.length > 1) {
            throw new Error(item.constructor.name + " is in more than one container");
        }
        return containers[0] || null;
    }

    getFlatNotes(reutilize = false): EditNote[] {
        return Group.getFlatNotes(reutilize, this);
    }

    isEmpty(): boolean {
        return this._notes.length === 0 && this._groups.length === 0;
    }

    static clearEmptyGroups() {
        const keys = Object.keys(Group.list) as unknown[] as number[];
        keys.forEach((key: number) => {
            const group = Group.list[key];
            if (group.isEmpty()) {
                delete Group.list[key];
            }
        });
    }


    constructor(name?: string) {
        if (name) {
            this.name = name;
        }
        this.id = Group.getUnusedId();
    }
}

