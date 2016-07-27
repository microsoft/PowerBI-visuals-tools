/*
 *  Power BI Visual CLI - Visual API v1.1.0 
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

declare module powerbi {
    enum VisualDataRoleKind {
        /** Indicates that the role should be bound to something that evaluates to a grouping of values. */
        Grouping = 0,
        /** Indicates that the role should be bound to something that evaluates to a single value in a scope. */
        Measure = 1,
        /** Indicates that the role can be bound to either Grouping or Measure. */
        GroupingOrMeasure = 2,
    }
    enum VisualDataChangeOperationKind {
        Create = 0,
        Append = 1,
    }
    enum VisualUpdateType {
        Data = 2,
        Resize = 4,
        ViewMode = 8,
        Style = 16,
        ResizeEnd = 32,
        All = 62,
    }
    enum VisualPermissions {
    }
    const enum CartesianRoleKind {
        X = 0,
        Y = 1,
    }
    const enum ViewMode {
        View = 0,
        Edit = 1,
    }
    const enum ResizeMode {
        Resizing = 1,
        Resized = 2,
    }
    module visuals.telemetry {
        const enum TelemetryCategory {
            Verbose = 0,
            CustomerAction = 1,
            CriticalError = 2,
            Trace = 3,
        }
        enum ErrorSource {
            PowerBI = 0,
            External = 1,
            User = 2,
        }
    }
    const enum JoinPredicateBehavior {
        /** Prevent items in this role from acting as join predicates. */
        None = 0,
    }
    const enum PromiseResultType {
        Success = 0,
        Failure = 1,
    }
}


declare module powerbi {
    export interface DragPayload {
    }
}



declare module jsCommon {
    export interface IStringResourceProvider {
        get(id: string): string;
        getOptional(id: string): string;
    }
}

declare module powerbi {
    /** 
     * An interface to promise/deferred, 
     * which abstracts away the underlying mechanism (e.g., Angular, jQuery, etc.). 
     */
    export interface IPromiseFactory {
        /** 
         * Creates a Deferred object which represents a task which will finish in the future.
         */
        defer<T>(): IDeferred<T>;

        /** 
         * Creates a Deferred object which represents a task which will finish in the future.
         */
        defer<TSuccess, TError>(): IDeferred2<TSuccess, TError>;

        /**
         * Creates a promise that is resolved as rejected with the specified reason.
         * This api should be used to forward rejection in a chain of promises.
         * If you are dealing with the last promise in a promise chain, you don't need to worry about it.
         * When comparing deferreds/promises to the familiar behavior of try/catch/throw,
         * think of reject as the throw keyword in JavaScript.
         * This also means that if you "catch" an error via a promise error callback and you want 
         * to forward the error to the promise derived from the current promise, 
         * you have to "rethrow" the error by returning a rejection constructed via reject.
         * 
         * @param reason Constant, message, exception or an object representing the rejection reason.
         */
        reject<TError>(reason?: TError): IPromise2<any, TError>;

        /**
         * Creates a promise that is resolved with the specified value.
         * This api should be used to forward rejection in a chain of promises. 
         * If you are dealing with the last promise in a promise chain, you don't need to worry about it.
         *
         * @param value Object representing the promise result.
         */
        resolve<TSuccess>(value?: TSuccess): IPromise2<TSuccess, any>;

        /**
         * Combines multiple promises into a single promise that is resolved when all of the input promises are resolved.
         * Rejects immediately if any of the promises fail
         */
        all(promises: IPromise2<any, any>[]): IPromise<any[]>;

        /**
         * Combines multiple promises into a single promise that is resolved when all of the input promises are resolved.
         * Does not resolve until all promises finish (success or failure).
         */
        allSettled<T>(promises: IPromise2<any, any>[]): IPromise<IPromiseResult<T>[]>;

        /**
         * Wraps an object that might be a value or a then-able promise into a promise. 
         * This is useful when you are dealing with an object that might or might not be a promise
         */
        when<T>(value: T | IPromise<T>): IPromise<T>;
    }

    /** 
     * Represents an operation, to be completed (resolve/rejected) in the future.
     */
    export interface IPromise<T> extends IPromise2<T, T> {
    }

    /**
     * Represents an operation, to be completed (resolve/rejected) in the future.
     * Success and failure types can be set independently.
     */
    export interface IPromise2<TSuccess, TError> {
        /**
         * Regardless of when the promise was or will be resolved or rejected, 
         * then calls one of the success or error callbacks asynchronously as soon as the result is available.
         * The callbacks are called with a single argument: the result or rejection reason.
         * Additionally, the notify callback may be called zero or more times to provide a progress indication, 
         * before the promise is resolved or rejected.
         * This method returns a new promise which is resolved or rejected via 
         * the return value of the successCallback, errorCallback.
         */
        then<TSuccessResult, TErrorResult>(successCallback: (promiseValue: TSuccess) => IPromise2<TSuccessResult, TErrorResult>, errorCallback?: (reason: TError) => TErrorResult): IPromise2<TSuccessResult, TErrorResult>;

        /**
         * Regardless of when the promise was or will be resolved or rejected,
         * then calls one of the success or error callbacks asynchronously as soon as the result is available.
         * The callbacks are called with a single argument: the result or rejection reason.
         * Additionally, the notify callback may be called zero or more times to provide a progress indication,
         * before the promise is resolved or rejected.
         * This method returns a new promise which is resolved or rejected via 
         * the return value of the successCallback, errorCallback.
         */
        then<TSuccessResult, TErrorResult>(successCallback: (promiseValue: TSuccess) => TSuccessResult, errorCallback?: (reason: TError) => TErrorResult): IPromise2<TSuccessResult, TErrorResult>;

        /**
         * Shorthand for promise.then(null, errorCallback).
         */
        catch<TErrorResult>(onRejected: (reason: any) => IPromise2<TSuccess, TErrorResult>): IPromise2<TSuccess, TErrorResult>;

        /**
         * Shorthand for promise.then(null, errorCallback).
         */
        catch<TErrorResult>(onRejected: (reason: any) => TErrorResult): IPromise2<TSuccess, TErrorResult>;

        /**
         * Allows you to observe either the fulfillment or rejection of a promise, 
         * but to do so without modifying the final value.
         * This is useful to release resources or do some clean-up that needs to be done 
         * whether the promise was rejected or resolved.
         * See the full specification for more information.
         * Because finally is a reserved word in JavaScript and reserved keywords 
         * are not supported as property names by ES3, you'll need to invoke 
         * the method like promise['finally'](callback) to make your code IE8 and Android 2.x compatible.
         */
        finally<T, U>(finallyCallback: () => any): IPromise2<T, U>;
    }

    export interface IDeferred<T> extends IDeferred2<T, T> {
    }

    export interface IDeferred2<TSuccess, TError> {
        resolve(value: TSuccess): void;
        reject(reason?: TError): void;
        promise: IPromise2<TSuccess, TError>;
    }

    export interface RejectablePromise2<T, E> extends IPromise2<T, E> {
        reject(reason?: E): void;
        resolved(): boolean;
        rejected(): boolean;
        pending(): boolean;
    }

    export interface RejectablePromise<T> extends RejectablePromise2<T, T> {
    }

    export interface IResultCallback<T> {
        (result: T, done: boolean): void;
    }

    export interface IPromiseResult<T> {
        type: PromiseResultType;
        value: T;
    }
}

declare module powerbi.visuals {
    export interface IRect {
        left: number;
        top: number;
        width: number;
        height: number;
    }
}

declare module powerbi.visuals {
    import Selector = data.Selector;

    export interface ISelectionIdBuilder {
        withCategory(categoryColumn: DataViewCategoryColumn, index: number): this;
        withSeries(seriesColumn: DataViewValueColumns, valueColumn: DataViewValueColumn | DataViewValueColumnGroup): this;
        withMeasure(measureId: string): this;
        createSelectionId(): ISelectionId;
    }

    export interface ISelectionId {
        equals(other: ISelectionId): boolean;
        includes(other: ISelectionId, ignoreHighlight?: boolean): boolean;
        getKey(): string;
        getSelector(): Selector;
        getSelectorsByColumn(): Selector;
        hasIdentity(): boolean;
    }
}

declare module powerbi.visuals {
    export interface IPoint {
        x: number;
        y: number;
    }
}

declare module powerbi.data {
    export interface CompiledDataViewMapping {
        metadata: CompiledDataViewMappingMetadata;
        categorical?: CompiledDataViewCategoricalMapping;
        table?: CompiledDataViewTableMapping;
        single?: CompiledDataViewSingleMapping;
        tree?: CompiledDataViewTreeMapping;
        matrix?: CompiledDataViewMatrixMapping;
        scriptResult?: CompiledDataViewScriptResultMapping;
        usage?: DataViewMappingUsage;
    }

    export interface CompiledDataViewMappingScriptDefinition {
        source: DataViewObjectPropertyIdentifier;
        provider: DataViewObjectPropertyIdentifier;
        imageFormat?: string;
        scriptInput?: ScriptInput;
    }

    export interface CompiledDataViewScriptResultMapping {
        dataInput: CompiledDataViewMapping;
        script: CompiledDataViewMappingScriptDefinition;
    }

    export interface CompiledDataViewMappingMetadata {
        /** The metadata repetition objects. */
        objects?: DataViewObjects;
    }

    export interface CompiledDataViewCategoricalMapping extends HasDataVolume, HasReductionAlgorithm {
        categories?: CompiledDataViewRoleMappingWithReduction | CompiledDataViewListRoleMappingWithReduction;
        values?: CompiledDataViewRoleMapping | CompiledDataViewGroupedRoleMapping | CompiledDataViewListRoleMapping;
        includeEmptyGroups?: boolean;
    }

    export interface CompiledDataViewGroupingRoleMapping {
        role: CompiledDataViewRole;
    }

    export interface CompiledDataViewSingleMapping {
        role: CompiledDataViewRole;
    }

    export interface CompiledDataViewTableMapping extends HasDataVolume {
        rows: CompiledDataViewRoleMappingWithReduction | CompiledDataViewListRoleMappingWithReduction;
    }

    export interface CompiledDataViewTreeMapping extends HasDataVolume {
        nodes?: CompiledDataViewRoleForMappingWithReduction;
        values?: CompiledDataViewRoleForMapping;
    }

    export interface CompiledDataViewMatrixMapping extends HasDataVolume {
        rows?: CompiledDataViewRoleForMappingWithReduction | CompiledDataViewListRoleMappingWithReduction;
        columns?: CompiledDataViewRoleForMappingWithReduction;
        values?: CompiledDataViewRoleForMapping | CompiledDataViewListRoleMapping;
    }

    export type CompiledDataViewRoleMapping = CompiledDataViewRoleBindMapping | CompiledDataViewRoleForMapping;

    export interface CompiledDataViewRoleBindMapping {
        bind: {
            to: CompiledDataViewRole;
        };
    }

    export interface CompiledDataViewRoleForMapping {
        for: {
            in: CompiledDataViewRole;
        };
    }

    export type CompiledDataViewRoleMappingWithReduction = CompiledDataViewRoleBindMappingWithReduction | CompiledDataViewRoleForMappingWithReduction;

    export interface CompiledDataViewRoleBindMappingWithReduction extends CompiledDataViewRoleBindMapping, HasReductionAlgorithm {
    }

    export interface CompiledDataViewRoleForMappingWithReduction extends CompiledDataViewRoleForMapping, HasReductionAlgorithm {
    }

    export interface CompiledDataViewGroupedRoleMapping {
        group: CompiledDataViewGroupedRoleGroupItemMapping;
    }

    export interface CompiledDataViewGroupedRoleGroupItemMapping extends HasReductionAlgorithm {
        by: CompiledDataViewRole;
        select: CompiledDataViewRoleMapping[];
    }

    export interface CompiledDataViewListRoleMapping {
        select: CompiledDataViewRoleMapping[];
    }

    export interface CompiledDataViewListRoleMappingWithReduction extends CompiledDataViewListRoleMapping, HasReductionAlgorithm {
    }

    export const enum CompiledSubtotalType {
        None = 0,
        Before = 1,
        After = 2
    }

    export interface CompiledDataViewRole {
        role: string;
        items: CompiledDataViewRoleItem[];
        subtotalType?: CompiledSubtotalType;
        showAll?: boolean;
        activeItems?: string[];
        aggregates?: DataViewMappingRoleProjectionAggregates;
    }

    export interface CompiledDataViewRoleItem {
        queryName: string;
        //changed to descriptor to not need to depend on ValueType class
        type?: ValueTypeDescriptor;
        joinPredicate?: JoinPredicateBehavior;
    }
}

declare module powerbi {
    export const enum SortDirection {
        Ascending = 1,
        Descending = 2,
    }
}

declare module powerbi {
    /** Represents views of a data set. */
    export interface DataView {
        metadata: DataViewMetadata;
        categorical?: DataViewCategorical;
        single?: DataViewSingle;
        tree?: DataViewTree;
        table?: DataViewTable;
        matrix?: DataViewMatrix;
        scriptResult?: DataViewScriptResultData;
    }

    export interface DataViewMetadata {
        columns: DataViewMetadataColumn[];

        /** The metadata repetition objects. */
        objects?: DataViewObjects;

        /** When defined, describes whether the DataView contains just a segment of the complete data set. */
        segment?: DataViewSegmentMetadata;
    }

    export interface DataViewMetadataColumn {
        /** The user-facing display name of the column. */
        displayName: string;

        /** The query name the source column in the query. */
        queryName?: string;

        /** The format string of the column. */
        format?: string; // TODO: Deprecate this, and populate format string through objects instead.

        /** Data type information for the column. */
        type?: ValueTypeDescriptor;

        /** Indicates that this column is a measure (aggregate) value. */
        isMeasure?: boolean;

        /** The position of the column in the select statement. */
        index?: number;

        /** The properties that this column provides to the visualization. */
        roles?: { [name: string]: boolean };

        /** The metadata repetition objects. */
        objects?: DataViewObjects;

        /** The name of the containing group. */
        groupName?: string;

        /** The sort direction of this column. */
        sort?: SortDirection;

        /** The KPI metadata to use to convert a numeric status value into its visual representation. */
        kpi?: DataViewKpiColumnMetadata;

        /** Indicates that aggregates should not be computed across groups with different values of this column. */
        discourageAggregationAcrossGroups?: boolean;

        /** The aggregates computed for this column, if any. */
        aggregates?: DataViewColumnAggregates;

        /** The SQExpr this column represents. */
        expr?: data.ISQExpr;
    }

    export interface DataViewSegmentMetadata {
    }

    export interface DataViewColumnAggregates {
        subtotal?: PrimitiveValue;
        max?: PrimitiveValue;
        min?: PrimitiveValue;
        count?: number;
        percentiles?: DataViewColumnPercentileAggregate[];

        /** Client-computed maximum value for a column. */
        maxLocal?: PrimitiveValue;

        /** Client-computed maximum value for a column. */
        minLocal?: PrimitiveValue;
    }

    export interface DataViewColumnPercentileAggregate {
        exclusive?: boolean;
        k: number;
        value: PrimitiveValue;
    }

    export interface DataViewCategorical {
        categories?: DataViewCategoryColumn[];
        values?: DataViewValueColumns;
    }

    export interface DataViewCategoricalColumn {
        source: DataViewMetadataColumn;
        values: any[];

        /** The data repetition objects. */
        objects?: DataViewObjects[];
    }

    export interface DataViewValueColumns extends Array<DataViewValueColumn> {
        /** Returns an array that groups the columns in this group together. */
        grouped(): DataViewValueColumnGroup[];

        /** The set of expressions that define the identity for instances of the value group.  This must match items in the DataViewScopeIdentity in the grouped items result. */
        identityFields?: data.ISQExpr[];

        source?: DataViewMetadataColumn;
    }

    export interface DataViewValueColumnGroup {
        values: DataViewValueColumn[];
        identity?: DataViewScopeIdentity;

        /** The data repetition objects. */
        objects?: DataViewObjects;

        name?: string;
    }

    export interface DataViewValueColumn extends DataViewCategoricalColumn {
        highlights?: any[];
        identity?: DataViewScopeIdentity;
    }

    // NOTE: The following is needed for backwards compatibility and should be deprecated.  Callers should use
    // DataViewMetadataColumn.aggregates instead.
    export interface DataViewValueColumn extends DataViewColumnAggregates {
    }

    export interface DataViewCategoryColumn extends DataViewCategoricalColumn {
        identity?: DataViewScopeIdentity[];

        /** The set of expressions that define the identity for instances of the category.  This must match items in the DataViewScopeIdentity in the identity. */
        identityFields?: data.ISQExpr[];
    }

    export interface DataViewSingle {
        value: any;
    }

    export interface DataViewTree {
        root: DataViewTreeNode;
    }

    export interface DataViewTreeNode {
        name?: string;

        /**
         * When used under the context of DataView.tree, this value is one of the elements in the values property.
         *
         * When used under the context of DataView.matrix, this property is the value of the particular 
         * group instance represented by this node (e.g. In a grouping on Year, a node can have value == 2016).
         *
         * DEPRECATED for usage under the context of DataView.matrix: This property is deprecated for objects 
         * that conform to the DataViewMatrixNode interface (which extends DataViewTreeNode).
         * New visuals code should consume the new property levelValues on DataViewMatrixNode instead.
         * If this node represents a composite group node in matrix, this property will be undefined.
         */
        value?: any;

        /** 
         * This property contains all the values in this node. 
         * The key of each of the key-value-pair in this dictionary is the position of the column in the 
         * select statement to which the value belongs.
         */
        values?: { [id: number]: DataViewTreeNodeValue };

        children?: DataViewTreeNode[];
        identity?: DataViewScopeIdentity;

        /** The data repetition objects. */
        objects?: DataViewObjects;

        /** The set of expressions that define the identity for the child nodes.  This must match items in the DataViewScopeIdentity of those nodes. */
        childIdentityFields?: data.ISQExpr[];
    }

    export interface DataViewTreeNodeValue {
        value?: any;
    }

    export interface DataViewTreeNodeMeasureValue extends DataViewTreeNodeValue, DataViewColumnAggregates {
        highlight?: any;
    }

    export interface DataViewTreeNodeGroupValue extends DataViewTreeNodeValue {
        count?: any;
    }

    export interface DataViewTable {
        columns: DataViewMetadataColumn[];

        identity?: DataViewScopeIdentity[];

        /** The set of expressions that define the identity for rows of the table.  This must match items in the DataViewScopeIdentity in the identity. */
        identityFields?: data.ISQExpr[];

        rows?: DataViewTableRow[];

        totals?: any[];
    }

    export interface DataViewTableRow extends Array<any> {
        /** The metadata repetition objects. */
        objects?: DataViewObjects[];
    }

    export interface DataViewMatrix {
        rows: DataViewHierarchy;
        columns: DataViewHierarchy;
        valueSources: DataViewMetadataColumn[];
    }

    export interface DataViewMatrixNode extends DataViewTreeNode {
        /** Indicates the level this node is on. Zero indicates the outermost children (root node level is undefined). */
        level?: number;

        children?: DataViewMatrixNode[];


        values?: { [id: number]: DataViewMatrixNodeValue };

        /**
         * Indicates the source metadata index on the node's level. Its value is 0 if omitted.
         *
         * DEPRECATED: This property is deprecated and exists for backward-compatibility only.
         * New visuals code should consume the new property levelSourceIndex on DataViewMatrixGroupValue instead.
         */
        levelSourceIndex?: number;

        /**
         * The values of the particular group instance represented by this node.
         * This array property would contain more than one element in a composite group
         * (e.g. Year == 2016 and Month == 'January').
         */
        levelValues?: DataViewMatrixGroupValue[];

        /** Indicates whether or not the node is a subtotal node. Its value is false if omitted. */
        isSubtotal?: boolean;
    }

    /**
     * Represents a value at a particular level of a matrix's rows or columns hierarchy.
     * In the hierarchy level node is an instance of a composite group, this object will
     * be one of multiple values
     */
    export interface DataViewMatrixGroupValue extends DataViewTreeNodeValue {
        /**
         * Indicates the index of the corresponding column for this group level value 
         * (held by DataViewHierarchyLevel.sources).
         *
         * @example
         * // For example, to get the source column metadata of each level value at a particular row hierarchy node:
         * let matrixRowsHierarchy: DataViewHierarchy = dataView.matrix.rows;
         * let targetRowsHierarchyNode = <DataViewMatrixNode>matrixRowsHierarchy.root.children[0];
         * // Use the DataViewMatrixNode.level property to get the corresponding DataViewHierarchyLevel...
         * let targetRowsHierarchyLevel: DataViewHierarchyLevel = matrixRows.levels[targetRowsHierarchyNode.level];
         * for (let levelValue in rowsRootNode.levelValues) {
         *   // columnMetadata is the source column for the particular levelValue.value in this loop iteration
         *   let columnMetadata: DataViewMetadataColumn = 
         *     targetRowsHierarchyLevel.sources[levelValue.levelSourceIndex];
         * }
         */
        levelSourceIndex: number;
    }

    /** Represents a value at the matrix intersection, used in the values property on DataViewMatrixNode (inherited from DataViewTreeNode). */
    export interface DataViewMatrixNodeValue extends DataViewTreeNodeValue {
        highlight?: any;

        /** Indicates the index of the corresponding measure (held by DataViewMatrix.valueSources). Its value is 0 if omitted. */
        valueSourceIndex?: number;
    }

    export interface DataViewHierarchy {
        root: DataViewMatrixNode;
        levels: DataViewHierarchyLevel[];
    }

    export interface DataViewHierarchyLevel {
        sources: DataViewMetadataColumn[];
    }

    export interface DataViewKpiColumnMetadata {
        graphic: string;

        // When false, five state KPIs are in: { -2, -1, 0, 1, 2 }. 
        // When true, five state KPIs are in: { -1, -0.5, 0, 0.5, 1 }.
        normalizedFiveStateKpiRange?: boolean;
    }

    export interface DataViewScriptResultData {
        imageBase64: string;
    }
}



declare module powerbi {
    export interface DataViewMapping {
        /**
         * Defines set of conditions, at least one of which must be satisfied for this mapping to be used.
         * Any roles not specified in the condition accept any number of items.
         */
        conditions?: DataViewMappingCondition[];
        requiredProperties?: DataViewObjectPropertyIdentifier[];

        categorical?: DataViewCategoricalMapping;
        table?: DataViewTableMapping;
        single?: DataViewSingleMapping;
        tree?: DataViewTreeMapping;
        matrix?: DataViewMatrixMapping;
        scriptResult?: DataViewScriptResultMapping;
        usage?: DataViewMappingUsage;
    }

    /** Describes whether a particular mapping is fits the set of projections. */
    export interface DataViewMappingCondition {
        [dataRole: string]: RoleCondition;
    }

    /** Describes a mapping which supports a data volume level. */
    export interface HasDataVolume {
        dataVolume?: number;
    }

    export interface DataViewCategoricalMapping extends HasDataVolume, HasReductionAlgorithm {
        categories?: DataViewRoleMappingWithReduction | DataViewListRoleMappingWithReduction;
        values?: DataViewRoleMapping | DataViewGroupedRoleMapping | DataViewListRoleMapping;

        /** Specifies a constraint on the number of data rows supported by the visual. */
        rowCount?: AcceptabilityNumberRange;

        /** Indicates whether the data rows include empty groups  */
        includeEmptyGroups?: boolean;
    }

    export interface DataViewSingleMapping {
        /** Indicates the role which is bound to this structure. */
        role: string;
    }

    export interface DataViewTableMapping extends HasDataVolume {
        rows: DataViewRoleMappingWithReduction | DataViewListRoleMappingWithReduction;

        /** Specifies a constraint on the number of data rows supported by the visual. */
        rowCount?: AcceptabilityNumberRange;
    }

    export interface DataViewTreeMapping extends HasDataVolume {
        nodes?: DataViewRoleForMappingWithReduction;
        values?: DataViewRoleForMapping;

        /** Specifies a constraint on the depth of the tree supported by the visual. */
        depth?: AcceptabilityNumberRange;
    }

    export interface DataViewMatrixMapping extends HasDataVolume {
        rows?: DataViewRoleForMappingWithReduction | DataViewListRoleMappingWithReduction;
        columns?: DataViewRoleForMappingWithReduction;
        values?: DataViewRoleForMapping | DataViewListRoleMapping;
    }


    export type DataViewRoleMapping = DataViewRoleBindMapping | DataViewRoleForMapping;



    export interface DataViewRoleBindMapping {
        /**
         * Indicates evaluation of a single-valued data role.
         * Equivalent to for, without support for multiple items.
         */
        bind: {
            to: string;

            /** Requests aggregates for the visual.  When specified, only the aggregates are requested. */
            aggregates?: DataViewMappingRoleProjectionAggregates;
        };
    }

    export interface DataViewRoleForMapping {
        /** Indicates iteration of the in data role, as an array. */
        for: {
            in: string;
        };
    }

    export type DataViewRoleMappingWithReduction = DataViewRoleBindMappingWithReduction | DataViewRoleForMappingWithReduction;

    export interface DataViewRoleBindMappingWithReduction extends DataViewRoleBindMapping, HasReductionAlgorithm {
    }

    export interface DataViewRoleForMappingWithReduction extends DataViewRoleForMapping, HasReductionAlgorithm {
    }

    export interface DataViewGroupedRoleMapping {
        group: {
            by: string;
            select: DataViewRoleMapping[];
            dataReductionAlgorithm?: ReductionAlgorithm;
        };
    }

    export interface DataViewListRoleMapping {
        select: DataViewRoleMapping[];
    }

    export interface DataViewListRoleMappingWithReduction extends DataViewListRoleMapping, HasReductionAlgorithm {
    }

    export interface HasReductionAlgorithm {
        dataReductionAlgorithm?: ReductionAlgorithm;
    }

    /** Describes how to reduce the amount of data exposed to the visual. */
    export interface ReductionAlgorithm {
        top?: DataReductionTop;
        bottom?: DataReductionBottom;
        sample?: DataReductionSample;
        window?: DataReductionWindow;
    }

    /** Reduce the data to the Top(count) items. */
    export interface DataReductionTop {
        count?: number;
    }

    /** Reduce the data to the Bottom count items. */
    export interface DataReductionBottom {
        count?: number;
    }

    /** Reduce the data using a simple Sample of count items. */
    export interface DataReductionSample {
        count?: number;
    }

    /** Allow the data to be loaded one window, containing count items, at a time. */
    export interface DataReductionWindow {
        count?: number;
    }

    export interface AcceptabilityNumberRange {
        /** Specifies a preferred range of values for the constraint. */
        preferred?: NumberRange;

        /** Specifies a supported range of values for the constraint. Defaults to preferred if not specified. */
        supported?: NumberRange;
    }

    /** Defines the acceptable values of a number. */
    export interface NumberRange {
        min?: number;
        max?: number;
    }

    export interface DataViewMappingScriptDefinition {
        source: DataViewObjectPropertyIdentifier;
        provider: DataViewObjectPropertyIdentifier;
        imageFormat?: string;
    }

    export interface DataViewScriptResultMapping {
        dataInput: DataViewMapping;
        script: DataViewMappingScriptDefinition;
    }

    /** Defines how the mapping will be used. The set of objects in this interface can modify the usage. */
    export interface DataViewMappingUsage {
        regression: {
            [propertyName: string]: DataViewObjectPropertyIdentifier;
        };
    }

    export interface DataViewMappingRoleProjectionAggregates {
        min?: boolean;
        max?: boolean;
    }
}

declare module powerbi {
    /** Represents evaluated, named, custom objects in a DataView. */
    export interface DataViewObjects {
        [name: string]: DataViewObject | DataViewObjectMap;
    }

    /** Represents an object (name-value pairs) in a DataView. */
    export interface DataViewObject {
        [propertyName: string]: DataViewPropertyValue;
    }

    export interface DataViewObjectWithId {
        id: string;
        object: DataViewObject;
    }

    export interface DataViewObjectPropertyIdentifier {
        objectName: string;
        propertyName: string;
    }

    export type DataViewObjectMap = DataViewObjectWithId[];

    export type DataViewPropertyValue = PrimitiveValue | StructuralObjectValue;
}

declare module powerbi.data {
    export interface DataViewObjectDescriptors {
        /** Defines general properties for a visualization. */
        general?: DataViewObjectDescriptor;

        [objectName: string]: DataViewObjectDescriptor;
    }

    /** Defines a logical object in a visualization. */
    export interface DataViewObjectDescriptor {
        displayName?: DisplayNameGetter;
        description?: DisplayNameGetter;
        properties: DataViewObjectPropertyDescriptors;
    }

    export interface DataViewObjectPropertyDescriptors {
        [propertyName: string]: DataViewObjectPropertyDescriptor;
    }

    /** Defines a property of a DataViewObjectDefinition. */
    export interface DataViewObjectPropertyDescriptor {
        displayName?: DisplayNameGetter;
        description?: DisplayNameGetter;
        placeHolderText?: DisplayNameGetter;
        type: DataViewObjectPropertyTypeDescriptor;
        rule?: DataViewObjectPropertyRuleDescriptor;

        /** Indicates whether the Format Painter should ignore this property. */
        suppressFormatPainterCopy?: boolean;
    }

    export type DataViewObjectPropertyTypeDescriptor = ValueTypeDescriptor | StructuralTypeDescriptor;

    export interface DataViewObjectPropertyRuleDescriptor {
        /** For rule typed properties, defines the input visual role name. */
        inputRole?: string;

        /** Defines the output for rule-typed properties. */
        output?: DataViewObjectPropertyRuleOutputDescriptor;
    }

    export interface DataViewObjectPropertyRuleOutputDescriptor {
        /** Name of the target property for rule output. */
        property: string;

        /** Names roles that define the selector for the output properties. */
        selector: string[];
    }

}

declare module powerbi.data {
    /** Defines a match against all instances of given roles. */
    export interface DataViewRoleWildcard {
        roles: string[];
        key: string;
    }
}

declare module powerbi {
    /** Encapsulates the identity of a data scope in a DataView. */
    export interface DataViewScopeIdentity {
        /** Predicate expression that identifies the scope. */
        expr: data.ISQExpr;

        /** Key string that identifies the DataViewScopeIdentity to a string, which can be used for equality comparison. */
        key: string;
    }
}

declare module powerbi.data {
    /** Defines a match against all instances of a given DataView scope. */
    export interface DataViewScopeWildcard {
        exprs: ISQExpr[];
        key: string;
    }
}

declare module powerbi.data {
    import IStringResourceProvider = jsCommon.IStringResourceProvider;

    export type DisplayNameGetter = ((resourceProvider: IStringResourceProvider) => string) | string;
}

declare module powerbi.data {
    export interface ScriptInputColumn {
        /** The queryName of the corresponding Select from the associated SemanticQuery providing the data for this column. */
        QueryName: string;

        /** The name of this column expected by the script. */
        Name: string;
    }

    export interface ScriptInput {
        VariableName?: string;
        Columns?: ScriptInputColumn[];
    }
}

declare module powerbi.data {
    /** Defines a selector for content, including data-, metadata, and user-defined repetition. */
    export interface Selector {
        /** Data-bound repetition selection. */
        data?: DataRepetitionSelector[];

        /** Metadata-bound repetition selection.  Refers to a DataViewMetadataColumn queryName. */
        metadata?: string;

        /** User-defined repetition selection. */
        id?: string;
    }

    export type DataRepetitionSelector = DataViewScopeIdentity | DataViewScopeWildcard | DataViewRoleWildcard;
}

declare module powerbi.data {
    //intentionally blank interfaces since this is not part of the public API

    export interface ISemanticFilter { }

    export interface ISQExpr { }

    export interface ISQConstantExpr extends ISQExpr { }

}

declare module powerbi {
    export interface IViewport {
        height: number;
        width: number;
    }
}

declare module powerbi {
    import DisplayNameGetter = powerbi.data.DisplayNameGetter;

    /** Defines the data roles understood by the IVisual. */
    export interface VisualDataRole {
        /** Unique name for the VisualDataRole. */
        name: string;

        /** Indicates the kind of role.  This value is used to build user interfaces, such as a field well. */
        kind: VisualDataRoleKind;

        displayName?: DisplayNameGetter;

        /** The tooltip text */
        description?: DisplayNameGetter;

        /** Indicates the preferred ValueTypes to be used in this data role.  This is used by authoring tools when adding fields into the visual. */
        preferredTypes?: ValueTypeDescriptor[];

        /** Indicates the required ValueTypes for this data role. Any values which do not match one of the ValueTypes specified will be null'd out */
        requiredTypes?: ValueTypeDescriptor[];

        /** Indicates the cartesian role for the visual role */
        cartesianKind?: CartesianRoleKind;

        /** Indicates the join predicate behavior of items in this role. */
        joinPredicate?: JoinPredicateBehavior;
    }

    export interface RoleCondition extends NumberRange {
        kind?: VisualDataRoleKind;
    }
}

declare module powerbi {

    /**
     * Interface that provides scripted access to geographical location information associated with the hosting device
     * The Interface is similar to W3 Geolocation API Specification {@link https://dev.w3.org/geo/api/spec-source.html}
     */
    export interface IGeolocation {
        /**
         * Request repeated updates
         * 
         * @param successCallback invoked when current location successfully obtained
         * @param errorCallback invoked when attempt to obtain the current location fails
         * 
         * @return a number value that uniquely identifies a watch operation
         */
        watchPosition(successCallback: IPositionCallback, errorCallback?: IPositionErrorCallback): number;
        /**
         * Cancel the updates
         * 
         * @param watchId  a number returned from {@link IGeolocation#watchPosition}
         */
        clearWatch(watchId: number): void;
        /**
         * One-shot position request.
         * 
         * @param successCallback invoked when current location successfully obtained
         * @param errorCallback invoked when attempt to obtain the current location fails
         */
        getCurrentPosition(successCallback: IPositionCallback, errorCallback?: IPositionErrorCallback): void;
    }

    export interface IPositionCallback {
        (position: Position): void;
    }

    export interface IPositionErrorCallback {
        (error: PositionError): void;
    }
}

declare module powerbi {
    export interface DefaultValueDefinition {
        value: data.ISQConstantExpr;
        identityFieldsValues?: data.ISQConstantExpr[];
    }

    export interface DefaultValueTypeDescriptor {
        defaultValue: boolean;
    }
}

declare module powerbi {
    import DisplayNameGetter = powerbi.data.DisplayNameGetter;

    export type EnumMemberValue = string | number;

    export interface IEnumMember {
        value: EnumMemberValue;
        displayName: DisplayNameGetter;
    }

    /** Defines a custom enumeration data type, and its values. */
    export interface IEnumType {
        /** Gets the members of the enumeration, limited to the validMembers, if appropriate. */
        members(validMembers?: EnumMemberValue[]): IEnumMember[];
    }

}

declare module powerbi {
    export interface Fill {
        solid?: {
            color?: string;
        };
        gradient?: {
            startColor?: string;
            endColor?: string;
        };
        pattern?: {
            patternKind?: string;
            color?: string;
        };
    }

    export interface FillTypeDescriptor {
        solid?: {
            color?: FillSolidColorTypeDescriptor;
        };
        gradient?: {
            startColor?: boolean;
            endColor?: boolean;
        };
        pattern?: {
            patternKind?: boolean;
            color?: boolean;
        };
    }

    export type FillSolidColorTypeDescriptor = boolean | FillSolidColorAdvancedTypeDescriptor;

    export interface FillSolidColorAdvancedTypeDescriptor {
        /** Indicates whether the color value may be nullable, and a 'no fill' option is appropriate. */
        nullable: boolean;
    }
}

declare module powerbi {
    export interface FillRule extends FillRuleGeneric<string, number> {
    }

    export interface FillRuleTypeDescriptor {
    }

    export interface FillRuleGeneric<TColor, TValue> {
        linearGradient2?: LinearGradient2Generic<TColor, TValue>;
        linearGradient3?: LinearGradient3Generic<TColor, TValue>;

        // stepped2?
        // ...
    }

    export interface LinearGradient2Generic<TColor, TValue> {
        max: RuleColorStopGeneric<TColor, TValue>;
        min: RuleColorStopGeneric<TColor, TValue>;
    }

    export interface LinearGradient3Generic<TColor, TValue> {
        max: RuleColorStopGeneric<TColor, TValue>;
        mid: RuleColorStopGeneric<TColor, TValue>;
        min: RuleColorStopGeneric<TColor, TValue>;
    }

    export interface RuleColorStopGeneric<TColor, TValue> {
        color: TColor;
        value?: TValue;
    }
}

declare module powerbi {
    export interface FilterTypeDescriptor {
        selfFilter?: boolean;
    }
}

declare module powerbi {
    export type GeoJson = GeoJsonDefinitionGeneric<string>;

    export interface GeoJsonDefinitionGeneric<T> {
        type: T;
        name: T;
        content: T;
    }

    export interface GeoJsonTypeDescriptor { }
}

declare module powerbi {
    export type ImageValue = ImageDefinitionGeneric<string>;

    export interface ImageDefinitionGeneric<T> {
        name: T;
        url: T;
        scaling?: T;
    }

    export interface ImageTypeDescriptor { }
}

declare module powerbi {
    export type Paragraphs = Paragraph[];
    export interface Paragraph {
        horizontalTextAlignment?: string;
        textRuns: TextRun[];
    }

    export interface ParagraphsTypeDescriptor {
    }

    export interface TextRunStyle {
        fontFamily?: string;
        fontSize?: string;
        fontStyle?: string;
        fontWeight?: string;
        textDecoration?: string;
    }

    export interface TextRun {
        textStyle?: TextRunStyle;
        url?: string;
        value: string;
    }
}

declare module powerbi {
    import SemanticFilter = data.ISemanticFilter;

    /** Defines instances of structural types. */
    export type StructuralObjectValue =
        Fill |
        FillRule |
        SemanticFilter |
        DefaultValueDefinition |
        ImageValue |
        Paragraphs |
        GeoJson;

    /** Describes a structural type in the client type system. Leaf properties should use ValueType. */
    export interface StructuralTypeDescriptor {
        fill?: FillTypeDescriptor;
        fillRule?: FillRuleTypeDescriptor;
        filter?: FilterTypeDescriptor;
        expression?: DefaultValueTypeDescriptor;
        image?: ImageTypeDescriptor;
        paragraphs?: ParagraphsTypeDescriptor;
        geoJson?: GeoJsonTypeDescriptor;

        //border?: BorderTypeDescriptor;
        //etc.
    }
}

declare module powerbi {
    /** Describes a data value type in the client type system. Can be used to get a concrete ValueType instance. */
    export interface ValueTypeDescriptor {
        // Simplified primitive types
        text?: boolean;
        numeric?: boolean;
        integer?: boolean;
        bool?: boolean;
        dateTime?: boolean;
        duration?: boolean;
        binary?: boolean;
        none?: boolean; //TODO: 5005022 remove none type when we introduce property categories.

        // Extended types
        temporal?: TemporalTypeDescriptor;
        geography?: GeographyTypeDescriptor;
        misc?: MiscellaneousTypeDescriptor;
        formatting?: FormattingTypeDescriptor;
        enumeration?: IEnumType;
        scripting?: ScriptTypeDescriptor;
        operations?: OperationalTypeDescriptor;
    }

    export interface ScriptTypeDescriptor {
        source?: boolean;
    }

    export interface TemporalTypeDescriptor {
        year?: boolean;
        month?: boolean;
    }

    export interface GeographyTypeDescriptor {
        address?: boolean;
        city?: boolean;
        continent?: boolean;
        country?: boolean;
        county?: boolean;
        region?: boolean;
        postalCode?: boolean;
        stateOrProvince?: boolean;
        place?: boolean;
        latitude?: boolean;
        longitude?: boolean;
    }

    export interface MiscellaneousTypeDescriptor {
        image?: boolean;
        imageUrl?: boolean;
        webUrl?: boolean;
        barcode?: boolean;
    }

    export interface FormattingTypeDescriptor {
        color?: boolean;
        formatString?: boolean;
        alignment?: boolean;
        labelDisplayUnits?: boolean;
        fontSize?: boolean;
        labelDensity?: boolean;
    }

    export interface OperationalTypeDescriptor {
        searchEnabled?: boolean;
    }

    /** Describes instances of value type objects. */
    export type PrimitiveValue = string | number | boolean | Date;
}

declare module powerbi {
    export interface IVisualStyle {
        colorPalette: IColorPalette;
        isHighContrast: boolean;
        titleText: ITextStyle;
        subTitleText: ITextStyle;
        labelText: ITextStyle;
        // TODO 4486317: This is a host-specific property that should be exposed through DataViewObjects.
        maxMarginFactor?: number;
    }

    export interface ITextStyle extends IStyleInfo {
        fontFace?: string;
        fontSize?: string;
        fontWeight?: string;
        color: IColorInfo;
    }

    export interface IColorPalette {
        background?: IColorInfo;
        foreground?: IColorInfo;

        positive?: IColorInfo;
        neutral?: IColorInfo;
        negative?: IColorInfo;
        separator?: IColorInfo;
        selection?: IColorInfo;

        dataColors: IDataColorPalette;
    }

    export interface IDataColorPalette {
        /** Gets the color scale associated with the given key. */
        getColorScaleByKey(scaleKey: string): IColorScale;

        /** Gets a fresh color scale with no colors allocated. */
        getNewColorScale(): IColorScale;

        /** Gets the nth color in the palette. */
        getColorByIndex(index: number): IColorInfo;

        /**
         * Gets the set of sentiment colors used for visuals such as KPIs
         * Note: This is only a temporary API so that we can have reasonable color schemes for KPIs
         * and gauges until the conditional formatting feature is implemented.
         */
        getSentimentColors(): IColorInfo[];

        getBasePickerColors(): IColorInfo[];

        /** Gets all the colors for the color palette **/
        getAllColors?(): IColorInfo[];
    }

    export interface IColorScale {
        /** Gets the color associated with the given key. */
        getColor(key: any): IColorInfo;

        /**
         * Clears the current scale, but rotates the colors such that the first color allocated will
         * the be first color that would have been allocated before clearing the scale. 
         */
        clearAndRotateScale(): void;

        /** Returns a copy of the current scale. */
        clone(): IColorScale;

        getDomain(): any[];
    }

    export interface IColorInfo extends IStyleInfo {
        value: string;
    }

    export interface IStyleInfo {
        className?: string;
    }
}

declare module powerbi {
    import DataViewObjectDescriptor = powerbi.data.DataViewObjectDescriptor;
    import DataViewObjectDescriptors = powerbi.data.DataViewObjectDescriptors;
    import Selector = powerbi.data.Selector;
    import IPoint = powerbi.visuals.IPoint;
    import ISemanticFilter = powerbi.data.ISemanticFilter;
    import ISQExpr = powerbi.data.ISQExpr;
    import IStringResourceProvider = jsCommon.IStringResourceProvider;
    import IRect = powerbi.visuals.IRect;

    /** Parameters available to a CustomizeQueryMethod */
    export interface CustomizeQueryOptions {
        /**
         * The data view mapping for this visual with some additional information. CustomizeQueryMethod implementations
         * are expected to edit this in-place.
         */
        dataViewMappings: data.CompiledDataViewMapping[];

        /**
         * Visual should prefer to request a higher volume of data.
         */
        preferHigherDataVolume?: boolean;

        /**
         * Whether the load more data feature (paging of data) for Cartesian charts should be enabled.
         */
        cartesianLoadMoreEnabled?: boolean;
    }

    /** Parameters available to a sortable visual candidate */
    export interface VisualSortableOptions {

        dataViewMappings: data.CompiledDataViewMapping[];
    }

    /** An imperative way for a visual to influence query generation beyond just its declared capabilities. */
    export interface CustomizeQueryMethod {
        (options: CustomizeQueryOptions): void;
    }

    /** Defines the visual filtering capability for a particular filter kind. */
    export interface VisualFilterMapping {
        /** Specifies what data roles are used to control the filter semantics for this filter kind. */
        targetRoles: string[];
    }

    /**
     * Defines the visual filtering capabilities for various filter kinds.
     * By default all visuals support attribute filters and measure filters in their innermost scope.
     */
    export interface VisualFilterMappings {
        measureFilter?: VisualFilterMapping;
    }

    /** Defines the capabilities of an IVisual. */
    export interface VisualCapabilities {
        /** Defines what roles the visual expects, and how those roles should be populated.  This is useful for visual generation/editing. */
        dataRoles?: VisualDataRole[];

        /** Defines the set of objects supported by this IVisual. */
        objects?: DataViewObjectDescriptors;

        /** Defines how roles that the visual understands map to the DataView.  This is useful for query generation. */
        dataViewMappings?: DataViewMapping[];

        /** Defines how filters are understood by the visual. This is used by query generation */
        filterMappings?: VisualFilterMappings;

        /** Indicates whether cross-highlight is supported by the visual. This is useful for query generation. */
        supportsHighlight?: boolean;

        /** Indicates whether the visual uses onSelected function for data selections.  Default is true. */
        supportsSelection?: boolean;

        /** Indicates whether sorting is supported by the visual. This is useful for query generation */
        sorting?: VisualSortingCapabilities;

        /** Indicates whether a default title should be displayed.  Visuals with self-describing layout can omit this. */
        suppressDefaultTitle?: boolean;

        /** Indicates whether a default padding should be applied. */
        suppressDefaultPadding?: boolean;

        /** Indicates whether drilling is supported by the visual. */
        drilldown?: VisualDrillCapabilities;

        /** Indicates whether rotating is supported by the visual. */
        canRotate?: boolean;

        /** Indicates whether showing the data underlying this visual would be helpful.  Visuals that already show raw data can specify this. */
        disableVisualDetails?: boolean;

        /** Indicates whether focus mode is supported for the visual. Visuals that would not benefit from focus mode (such as non-data-bound ones) can set it to true.  */
        disableFocusMode?: boolean;
    }

    /** Defines the visual sorting capability. */
    export interface VisualSortingCapabilities {
        /** When specified, indicates that the IVisual wants default sorting behavior. */
        default?: {};

        /** When specified, indicates that the IVisual wants to control sort interactivity. */
        custom?: {};

        /** When specified, indicates sorting that is inherently implied by the IVisual.  This is useful to automatically sort. */
        implicit?: VisualImplicitSorting;
    }

    /** Defines the visual's drill capability. */
    export interface VisualDrillCapabilities {
        /** Returns the drillable role names for this visual **/
        roles?: string[];
    }

    /** Defines implied sorting behaviour for an IVisual. */
    export interface VisualImplicitSorting {
        clauses: VisualImplicitSortingClause[];
    }

    export interface VisualImplicitSortingClause {
        role: string;
        direction: SortDirection;
    }

    export interface VisualUpdateOptions {
        viewport: IViewport;
        dataViews: DataView[];
        suppressAnimations?: boolean;
        viewMode?: ViewMode;
        resizeMode?: ResizeMode;
        type?: VisualUpdateType;
        /** Indicates what type of update has been performed on the data.
        The default operation kind is Create.*/
        operationKind?: VisualDataChangeOperationKind;
    }

    export interface VisualDataChangedOptions {
        dataViews: DataView[];

        /** Optionally prevent animation transitions */
        suppressAnimations?: boolean;

        /** Indicates what type of update has been performed on the data.
        The default operation kind is Create.*/
        operationKind?: VisualDataChangeOperationKind;
    }

    export interface CustomSortEventArgs {
        sortDescriptors: SortableFieldDescriptor[];
    }

    export interface SortableFieldDescriptor {
        queryName: string;
        sortDirection?: SortDirection;
    }

    export interface IVisualErrorMessage {
        message: string;
        title: string;
        detail: string;
    }

    export interface IVisualWarning {
        code: string;
        getMessages(resourceProvider: IStringResourceProvider): IVisualErrorMessage;
    }

    /** Animation options for visuals. */
    export interface AnimationOptions {
        /** Indicates whether all transition frames should be flushed immediately, effectively "disabling" any visual transitions. */
        transitionImmediate: boolean;
    }

    /** Interactivity options for visuals. */
    export interface InteractivityOptions {
        /** Indicates that dragging of data points should be permitted. */
        dragDataPoint?: boolean;

        /** Indicates that data points should be selectable. */
        selection?: boolean;

        /** Indicates that the chart and the legend are interactive */
        isInteractiveLegend?: boolean;

        /** Indicates overflow behavior. Values are CSS oveflow strings */
        overflow?: string;
    }

    export interface VisualDragPayload extends DragPayload {
        data?: Selector;
        field?: {};
    }

    export interface DragEventArgs {
        event: DragEvent;
        data: VisualDragPayload;
    }

    /** Defines geocoding services. */
    export interface GeocodeOptions {
        /** promise that should abort the request when resolved */
        timeout?: IPromise<any>;
    }

    export interface IGeocoder {
        geocode(query: string, category?: string, options?: GeocodeOptions): IPromise<IGeocodeCoordinate>;
        geocodeBoundary(latitude: number, longitude: number, category: string, levelOfDetail?: number, maxGeoData?: number, options?: GeocodeOptions): IPromise<IGeocodeBoundaryCoordinate>;
        geocodePoint(latitude: number, longitude: number, options?: GeocodeOptions): IPromise<IGeocodeResource>;

        /** returns data immediately if it is locally available (e.g. in cache), null if not in cache */
        tryGeocodeImmediate(query: string, category?: string): IGeocodeCoordinate;
        tryGeocodeBoundaryImmediate(latitude: number, longitude: number, category: string, levelOfDetail?: number, maxGeoData?: number): IGeocodeBoundaryCoordinate;
    }

    export interface IGeocodeCoordinate {
        latitude: number;
        longitude: number;
    }

    export interface IGeocodeBoundaryCoordinate {
        latitude?: number;
        longitude?: number;
        locations?: IGeocodeBoundaryPolygon[]; // one location can have multiple boundary polygons
    }

    export interface IGeocodeResource extends IGeocodeCoordinate {
        addressLine: string;
        locality: string;
        neighborhood: string;
        adminDistrict: string;
        adminDistrict2: string;
        formattedAddress: string;
        postalCode: string;
        countryRegionIso2: string;
        countryRegion: string;
        landmark: string;
        name: string;
    }

    export interface IGeocodeBoundaryPolygon {
        nativeBing: string;

        /** array of lat/long pairs as [lat1, long1, lat2, long2,...] */
        geographic?: Float64Array;

        /** array of absolute pixel position pairs [x1,y1,x2,y2,...]. It can be used by the client for cache the data. */
        absolute?: Float64Array;
        absoluteBounds?: IRect;

        /** string of absolute pixel position pairs "x1 y1 x2 y2...". It can be used by the client for cache the data. */
        absoluteString?: string;
    }

    export interface SelectorForColumn {
        [queryName: string]: data.DataRepetitionSelector;
    }

    export interface SelectorsByColumn {
        /** Data-bound repetition selection. */
        dataMap?: SelectorForColumn;

        /** Metadata-bound repetition selection.  Refers to a DataViewMetadataColumn queryName. */
        metadata?: string;

        /** User-defined repetition selection. */
        id?: string;
    }

    // TODO: Consolidate these two into one object and add a method to transform SelectorsByColumn[] into Selector[] for components that need that structure
    export interface SelectEventArgs {
        data: Selector[];
        data2?: SelectorsByColumn[];
    }

    export interface ContextMenuArgs {
        data: SelectorsByColumn[];

        /** Absolute coordinates for the top-left anchor of the context menu. */
        position: IPoint;
    }

    export interface SelectObjectEventArgs {
        object: DataViewObjectDescriptor;
    }

    export interface FilterAnalyzerOptions {
        dataView: DataView;

        /** The DataViewObjectPropertyIdentifier for default value */
        defaultValuePropertyId: DataViewObjectPropertyIdentifier;

        /** The filter that will be analyzed */
        filter: ISemanticFilter;

        /** The field SQExprs used in the filter */
        fieldSQExprs: ISQExpr[];
    }

    export interface AnalyzedFilter {
        /** The default value of the slicer selected item and it can be undefined if there is no default value */
        defaultValue?: DefaultValueDefinition;

        /** Indicates the filter has Not condition. */
        isNotFilter: boolean;

        /** The selected filter values. */
        selectedIdentities: DataViewScopeIdentity[];

        /** The filter after analyzed. It will be the default filter if it has defaultValue and the pre-analyzed filter is undefined. */
        filter: ISemanticFilter;
    }

    export interface DisplayNameIdentityPair {
        displayName: string;
        identity: DataViewScopeIdentity;
    }
}




declare module powerbi {
    import Selector = powerbi.data.Selector;

    export interface VisualObjectInstance {
        /** The name of the object (as defined in VisualCapabilities). */
        objectName: string;

        /** A display name for the object instance. */
        displayName?: string;

        /** The set of property values for this object.  Some of these properties may be defaults provided by the IVisual. */
        properties: {
            [propertyName: string]: DataViewPropertyValue;
        };

        /** The selector that identifies this object. */
        selector: Selector;

        /** Defines the constrained set of valid values for a property. */
        validValues?: {
            [propertyName: string]: string[];
        };

        /** (Optional) VisualObjectInstanceEnumeration category index. */
        containerIdx?: number;
    }

    export type VisualObjectInstanceEnumeration = VisualObjectInstance[] | VisualObjectInstanceEnumerationObject;

    export interface VisualObjectInstanceEnumerationObject {
        /** The visual object instances. */
        instances: VisualObjectInstance[];

        /** Defines a set of containers for related object instances. */
        containers?: VisualObjectInstanceContainer[];
    }

    export interface VisualObjectInstanceContainer {
        displayName: data.DisplayNameGetter;
    }

    export interface VisualObjectInstancesToPersist {
        /** Instances which should be merged with existing instances. */
        merge?: VisualObjectInstance[];

        /** Instances which should replace existing instances. */
        replace?: VisualObjectInstance[];

        /** Instances which should be deleted from the existing instances. */
        remove?: VisualObjectInstance[];
    }

    export interface EnumerateVisualObjectInstancesOptions {
        objectName: string;
    }
}

declare module powerbi {
    import Selector = powerbi.data.Selector;

    export interface VisualObjectRepetition {
        /** The selector that identifies the objects. */
        selector: Selector;

        /** The set of repetition descriptors for this object. */
        objects: {
            [objectName: string]: DataViewRepetitionObjectDescriptor;
        };
    }

    export interface DataViewRepetitionObjectDescriptor {
        /** Properties used for formatting (e.g., Conditional Formatting). */
        formattingProperties?: string[];
    }
}

declare module powerbi.extensibility {
    import DataViewObjectDescriptors = powerbi.data.DataViewObjectDescriptors;

    /** Defines the capabilities of an IVisual. */
    export interface VisualCapabilities {
        /** Defines what roles the visual expects, and how those roles should be populated.  This is useful for visual generation/editing. */
        dataRoles?: VisualDataRole[];

        /** Defines the set of objects supported by this IVisual. */
        objects?: DataViewObjectDescriptors;

        /** Defines how roles that the visual understands map to the DataView.  This is useful for query generation. */
        dataViewMappings?: DataViewMapping[];

        /** Indicates whether cross-highlight is supported by the visual. This is useful for query generation. */
        supportsHighlight?: boolean;

        /** Indicates whether sorting is supported by the visual. This is useful for query generation */
        sorting?: VisualSortingCapabilities;
    }
}

declare module powerbi.extensibility {

    export function VisualPlugin(options: IVisualPluginOptions): ClassDecorator;

    export interface IVisualPluginOptions {
        transform?: IVisualDataViewTransform;
    }

    export interface IVisualConstructor {
        __transform__?: IVisualDataViewTransform;
    }

    export interface IVisualDataViewTransform {
        <T>(dataview: DataView[]): T;
    }

    // These are the base interfaces. These should remain empty
    // All visual versions should extend these for type compatability

    export interface IVisual { }

    export interface IVisualHost { }

    export interface VisualUpdateOptions { }

    export interface VisualConstructorOptions { }
}

declare module powerbi.extensibility {

    export interface VisualVersionOverloads {
        [name: string]: Function;
    }

    export interface VisualVersionOverloadFactory {
        (visual: powerbi.extensibility.IVisual): VisualVersionOverloads;
    }

}

/**
 * Change Log Version 1.1.0
 */
declare module powerbi.extensibility.visual {
    /**
     * Represents a visualization displayed within an application (PowerBI dashboards, ad-hoc reporting, etc.).
     * This interface does not make assumptions about the underlying JS/HTML constructs the visual uses to render itself.
     */
    export interface IVisual extends extensibility.IVisual {
        /** Notifies the IVisual of an update (data, viewmode, size change). */
        update<T>(options: VisualUpdateOptions, viewModel: T): void;

        /** Notifies the visual that it is being destroyed, and to do any cleanup necessary (such as unsubscribing event handlers). */
        destroy?(): void;

        /** Gets the set of objects that the visual is currently displaying. */
        enumerateObjectInstances?(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration;
    }

    export interface IVisualHost extends extensibility.IVisualHost {
        createSelectionIdBuilder: () => visuals.ISelectionIdBuilder;
        createSelectionManager: () => ISelectionManager;
        /** An array of default colors to be used by the visual */
        colors: IColorInfo[];
    }

    export interface VisualUpdateOptions extends extensibility.VisualUpdateOptions {
        viewport: IViewport;
        dataViews: DataView[];
        type: VisualUpdateType;
        viewMode?: ViewMode;
    }

    export interface VisualConstructorOptions extends extensibility.VisualConstructorOptions {
        element: HTMLElement;
        host: IVisualHost;
    }
}

declare module powerbi.extensibility {
    interface ISelectionManager {
        select(selectionId: ISelectionId, multiSelect?: boolean): IPromise<ISelectionId[]>;
        hasSelection(): boolean;
        clear(): IPromise<{}>;
        getSelectionIds(): ISelectionId[];
    }
}

declare module powerbi.extensibility {
    export interface Selector { }

    export interface ISelectionId {
        equals(other: ISelectionId): boolean;
        includes(other: ISelectionId, ignoreHighlight?: boolean): boolean;
        getKey(): string;
        getSelector(): Selector;
        getSelectorsByColumn(): Selector;
        hasIdentity(): boolean;
    }

    export interface ISelectionIdBuilder {
        withCategory(categoryColumn: DataViewCategoryColumn, index: number): this;
        withSeries(seriesColumn: DataViewValueColumns, valueColumn: DataViewValueColumn | DataViewValueColumnGroup): this;
        withMeasure(measureId: string): this;
        createSelectionId(): ISelectionId;
    }
}
