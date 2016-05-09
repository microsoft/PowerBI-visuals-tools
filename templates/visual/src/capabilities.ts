module powerbi.extensibility.visual {
    export var capabilities: VisualCapabilities = {
        dataRoles: [
            {
                displayName: 'Category Data',
                name: 'category',
                kind: powerbi.VisualDataRoleKind.Grouping,
            },           
            {
                displayName: 'Measure Data',
                name: 'measure',
                kind: powerbi.VisualDataRoleKind.Measure,
            }   
        ],
        dataViewMappings:[{
            categorical: {
                categories: {
                    for: { in: 'category' },
                    dataReductionAlgorithm: { top: {} }
                },
                values: {
                    select: [{ bind: { to: 'measure' } }]
                },
            }
        }]
    };
}