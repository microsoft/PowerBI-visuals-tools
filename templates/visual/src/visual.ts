module powerbi.extensibility.visual {
    export class Visual implements IVisual {
        private target: HTMLElement;
        private updateCount: number;
        
        constructor(options: VisualConstructorOptions) {   
            console.log('Visual constructor', options);
            
            this.target = options.element;
            this.updateCount = 0;
        }
        
        public update(options: VisualUpdateOptions) {
            console.log('Visual update', options);
            this.target.innerText = "Update count: " + (this.updateCount++);
        }
    }
}