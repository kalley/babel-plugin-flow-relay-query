/* @flow */
/* eslint no-use-before-define:0 */

type FlowBooleanType = { type: "boolean", nullable: boolean, fieldName?: string, variables?: Object };
type FlowNumberType = { type: "number", nullable: boolean, fieldName?: string, variables?: Object };
type FlowStringType = { type: "string", nullable: boolean, fieldName?: string, variables?: Object };
type FlowAnyType = { type: "any", nullable: boolean, fieldName?: string, variables?: Object };
type FlowLiteralType = { type: "literal", nullable: boolean, fieldName?: string, variables?: Object, value: any }

export type FlowScalarType = FlowBooleanType | FlowNumberType | FlowStringType | FlowAnyType | FlowLiteralType;
export type FlowObjectType = { type: "object", nullable: boolean, fields: FlowTypes, fieldName?: string, variables?: Object };
export type FlowArrayType = { type: "array", child: FlowType, fieldName?: string, variables?: Object };
export type FlowType = FlowObjectType | FlowScalarType | FlowArrayType;

export type FlowTypes = { [name: string]: FlowType }
