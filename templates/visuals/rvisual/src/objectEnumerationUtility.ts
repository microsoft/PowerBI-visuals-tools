module powerbi.extensibility.visual {
    export function getValue<T>(objects: DataViewObjects, objectName: string, propertyName: string, defaultValue: T ): T {
        if(objects) {
            let object = objects[objectName];
            if(object) {
                let property: T = <T>object[propertyName];
                if(property !== undefined) {
                    return property;
                }
            }
        }
        return defaultValue;
    }

    export function getFillValue(objects: DataViewObjects, objectName: string, propertyName: string, defaultValue: string ): string {
        if(objects) {
            let object = objects[objectName];
            if(object) {
                let fill: Fill = <Fill>object[propertyName];
                if(fill !== undefined && fill.solid !== undefined && fill.solid.color !== undefined) {
                    return fill.solid.color;
                }
            }
        }
        return defaultValue;
    }
}