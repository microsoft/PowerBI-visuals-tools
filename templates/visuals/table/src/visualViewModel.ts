export interface CategoryViewModel {
    value: string;
    identity: string;
    color: string;
}

export interface ValueViewModel {
    values: any[];
}

export interface VisualViewModel {
    categories: CategoryViewModel[];
    values: ValueViewModel[];
}