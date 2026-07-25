// ==================== TYPE INFERENCE ====================
export function Union(...args) {
    var _a;
    if (args.length === 0)
        throw new Error("Union must have at least one type");
    return _a = class union extends ModelCoreUnion {
            constructor() {
                super(...args);
                return this;
            }
        },
        _a.unionTypes = args,
        _a;
}
export class ModelCoreUnion extends Array {
}
ModelCoreUnion.unionTypes = [];
