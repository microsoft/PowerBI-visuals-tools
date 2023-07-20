export default function (options) {
    return `declare var powerbi;
powerbi.visuals = powerbi.visuals || {};
powerbi.visuals.plugins = powerbi.visuals.plugins || {};
powerbi.visuals.plugins["${options.pluginName}"] = {
    name: '${options.pluginName}',
    displayName: '${options.visualDisplayName}',
    class: '${options.visualClass}',
    version: '${options.visualVersion}',
    apiVersion: '${options.apiVersion}',
    create: (options: extensibility.visual.VisualConstructorOptions) => new powerbi.extensibility.visual.${options.visualClass}(options),
    custom: true
}`;
};
