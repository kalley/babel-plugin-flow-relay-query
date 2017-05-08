/* @flow */
import type { FlowType, FlowTypes } from "./types";

function flowTypeAnnotationToString(type: TypeTypeAnnotation, nullable: boolean, fieldName?: string, variables?: Object): FlowType {
  switch (type.type) {
    case "BooleanTypeAnnotation":
      return { type: "boolean", nullable, fieldName, variables };
    case "NumberTypeAnnotation":
      return { type: "number", nullable, fieldName, variables };
    case "StringTypeAnnotation":
      return { type: "string", nullable, fieldName, variables };
    case "StringLiteralTypeAnnotation":
    case "BooleanLiteralTypeAnnotation":
    case "NumericLiteralTypeAnnotation":
      return {
        type: "literal",
        nullable,
        variables,
        value: typeof type.value === "string" ? type.value.replace(/'/g, "\"") : type.value
      };
    default:
      return { type: "any", nullable, fieldName, variables };
  }
}

// convert an ObjectTypeAnnotation to a js object
function convertFlowObjectTypeAnnotation(
  objectType: ObjectTypeAnnotation,
  flowTypes: { [name: string ]: ObjectTypeAnnotation },
  fieldName?: string,
  variables?: Object
): FlowTypes {
  return objectType.properties.reduce((obj, property) => {
    const key = property.key.name;
    // property.optional indicates the presence of a question mark at the end of a field
    // eg. field?: blah
    // given a GraphQL schema cannot represent an optional object key we don't need to care about it
    const nullable = false;

    return {
      ...obj,
      [key]: convertTypeAnnotationToFlowType(property.value, nullable, flowTypes, fieldName, variables)
    };
  }, {});
}

function convertFunctionTypeAnnotation(
  objectType: FunctionTypeAnnotation,
  flowTypes: { [name: string ]: ObjectTypeAnnotation },
): FlowTypes {
  return objectType.params.reduce((obj, param) => {
    const key = param.name.name;

    return {
      ...obj,
      [key]: convertTypeAnnotationToFlowType(param.typeAnnotation, param.optional, flowTypes)
    };
  }, {});
}

export function convertTypeAnnotationToFlowType(
  value: TypeTypeAnnotation,
  nullable: boolean,
  flowTypes: { [name: string ]: ObjectTypeAnnotation },
  fieldName?: string,
  variables?: Object
): FlowType {
  if (value.type === "NullableTypeAnnotation") {
    return convertTypeAnnotationToFlowType(value.typeAnnotation, true, flowTypes, fieldName, variables);
  }

  if (value.type === "GenericTypeAnnotation") {
    if (flowTypes[value.id.name]) {
      return convertTypeAnnotationToFlowType(flowTypes[value.id.name], nullable, flowTypes, fieldName, variables);
    }

    if (value.typeParameters) {
      if (value.id.name === "AliasFor") {
        const [fieldNameType, type] = value.typeParameters.params;

        return convertTypeAnnotationToFlowType(type, nullable, flowTypes, fieldNameType.value, variables);
      }

      if (value.id.name === "PropertyWithArgs") {
        const prop = value.typeParameters.params[0];

        return convertTypeAnnotationToFlowType(prop.returnType, nullable, flowTypes, fieldName, convertFunctionTypeAnnotation(prop, flowTypes));
      }
    }
  }

  if (value.type === "ObjectTypeAnnotation") {
    return {
      fieldName,
      type: "object",
      nullable,
      fields: convertFlowObjectTypeAnnotation(value, flowTypes, undefined, variables)
    };
  }

  if (value.type === "ArrayTypeAnnotation") {
    return {
      type: "array",
      child: convertTypeAnnotationToFlowType(value.elementType, nullable, flowTypes, fieldName, variables)
    };
  }

  return flowTypeAnnotationToString(value, nullable, fieldName, variables);
}
