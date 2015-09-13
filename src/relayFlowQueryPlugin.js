/* @flow */
import fs from "fs";
import path from "path";

function isObject(obj) {
  return obj !== null && typeof obj === "object" && !Array.isArray(obj);
}

function uppercaseFirstChar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const generateFragmentFromPropsFunctionName = "generateFragmentFromProps";

declare class PluginClass {
  visitor: Object
}

export default function({ Plugin, types: t }: Object): PluginClass {
  // t.templateElement does not pass args
  // https://github.com/babel/babel/blob/master/packages/babel/src/types/definitions/es2015.js#L123
  const originalTemplateElement = t.templateElement;
  t.templateElement = (value, tail = true) => {
    const templateElement = originalTemplateElement.apply(this, arguments);
    return Object.assign({}, templateElement, { value, tail });
  };

  function flowTypeAnnotationToString(type) {
    if (t.isStringTypeAnnotation(type)) {
      return "string";
    } else if (t.isNumberTypeAnnotation(type)) {
      return "number";
    } else if (t.isBooleanTypeAnnotation(type)) {
      return "boolean";
    }
    return "any";
  }

  // convert an ObjectTypeAnnotation to a js object
  function convertFlowObjectTypeAnnotation(objectType) {
    return objectType.properties.reduce((obj, property) => {
      const key = property.key.name;
      const value = property.value;
      if (t.isObjectTypeAnnotation(value)) {
        obj[key] = convertFlowObjectTypeAnnotation(value);
      } else {
        obj[key] = flowTypeAnnotationToString(value);
      }
      return obj;
    }, {});
  }

  function convertToGraphQLString(obj, level = 1) {
    const indentation = "  ".repeat(level);

    const strings = Object.keys(obj).reduce((parts, key) => {
      const value = obj[key];
      let str = key;
      if (isObject(value)) {
        str = str + " {\n" + convertToGraphQLString(value, level + 1) + "\n" + indentation + "}";
      }
      parts.push(indentation + str);
      return parts;
    }, []);

    return strings.join(",\n");
  }

  function storeTypeAlias(node, state) {
    state.opts.extra.flowTypes = state.opts.extra.flowTypes || {};
    state.opts.extra.flowTypes[node.id.name] = node;
  }

  function storeClassPropTypes(state, className, propType) {
    state.opts.extra.classPropTypes = state.opts.extra.classPropTypes || {};
    state.opts.extra.classPropTypes[className] = propType;
  }

  function storeImports(state, filename, variables) {
    state.opts.extra.storedImports = state.opts.extra.storedImports || {};
    variables.forEach(variable => state.opts.extra.storedImports[variable] = filename);
  }

  function storeRelayContainerFragments(state, name, fragments) {
    state.opts.extra.relayContainerFragments = state.opts.extra.relayContainerFragments || {};
    state.opts.extra.relayContainerFragments[name] = fragments;
  }

  function extendsReactComponent(node) {
    if (!node || !t.isClassDeclaration(node)) {
      return false;
    }

    const superClass = node.superClass;
    return superClass && superClass.object.name === "React" && superClass.property.name === "Component";
  }

  function isTypeImport(node) {
    return t.isImportDeclaration(node) && (node.importKind === "type" || node.importKind === "typeof");
  }

  function parseImport(node, currentFilename) {
    if (!t.isImportDeclaration(node)) {
      return null;
    }

    if (!currentFilename) {
      throw new Error("Cannot parse import if there is no current file");
    }

    const variables = node.specifiers.map(specifier => specifier.local.name);
    let importFile = node.source.value;
    if (importFile === ".") {
      importFile = "./index";
    }

    let filename = "";
    if (importFile[0] === ".") {
      const importFileName = path.parse(importFile).name;
      const dir = path.dirname(path.resolve(path.dirname(currentFilename), importFile));
      const files = fs.readdirSync(dir).filter(file => {
        const { name } = path.parse(file);
        return name === importFileName;
      });
      filename = path.resolve(dir, files[0]);
    } else {
      filename = require.resolve(importFile);
    }

    return { filename, variables };
  }

  function parseReactProps(self, node) {
    if (!t.isClassProperty(node)) {
      return null;
    }

    if (node.key.name !== "props") {
      return null;
    }

    const typeAnnotation = node.typeAnnotation && node.typeAnnotation.typeAnnotation;
    if (!typeAnnotation || !t.isGenericTypeAnnotation(typeAnnotation)) {
      return null;
    }

    const classDec = self.findParent(p => t.isClassDeclaration(p));
    if (!extendsReactComponent(classDec && classDec.node)) {
      return null;
    }

    const className = classDec.node.id.name;
    const propType = typeAnnotation.id.name;

    return { className, propType };
  }

  // parse a file with the provided visitor
  function parseFile(filename, visitor, scope) {
    const babel = require("babel-core");
    const program = babel.parse(fs.readFileSync(filename, "utf8"));

    babel.traverse(program, visitor, scope, program);
  }

  return new Plugin("flow-relay-query", {
    visitor: {
      TypeAlias(node, parent, scope, state) {
        storeTypeAlias(node, state);
      },

      JSXElement(node, parent, scope, state) {
        const name = t.isJSXIdentifier(node.openingElement.name) && node.openingElement.name.name;
        const imports = state.opts.extra.storedImports || {};
        const filename = imports[name];
        if (filename) {
          const visitor = {
            CallExpression(n) {
              if (this.get("callee").matchesPattern("Relay.createContainer")) {
                const reactComponentName = n.arguments[0].name;
                const fragments = n.arguments[1].properties.filter(_ => _.key.name === "fragments");
                const fragmentNames = fragments.length === 1 ? fragments[0].value.properties.map(_ => _.key.name) : [];
                storeRelayContainerFragments(state, reactComponentName, fragmentNames);
              }
            }
          };
          parseFile(filename, visitor, scope);
        }
      },

      ClassProperty(node, parent, scope, state) {
        const { className, propType } = parseReactProps(this, node) || {};
        if (className && propType) {
          storeClassPropTypes(state, className, propType);
        }
      },

      ImportDeclaration(node, parent, scope, state) {
        const typeImport = isTypeImport(node);

        // track imports for use later
        if (!typeImport) {
          const { filename, variables } = parseImport(node, state.opts.filename) || {};
          storeImports(state, filename, variables);
        }

        // handle imported types
        if (typeImport) {
          const { filename, variables } = parseImport(node, state.opts.filename) || {};

          const visitor = {
            TypeAlias(n) {
              const typeName = n.id.name;
              if (variables.indexOf(typeName) >= 0) {
                storeTypeAlias(n, state);
              }
            }
          };
          parseFile(filename, visitor, null);
        }

        // remove the marker function import
        const remove = node.specifiers.filter(specifier => {
          return specifier.local.name === generateFragmentFromPropsFunctionName;
        }).length > 0;

        if (remove) {
          this.dangerouslyRemove();
        }
      },

      CallExpression(node, parent, scope, state) {
        if (!t.isIdentifier(node.callee, { name: generateFragmentFromPropsFunctionName })) {
          return;
        }

        const relayCreateContainer = this.findParent(p => {
          return t.isCallExpression(p) && p.get("callee").matchesPattern("Relay.createContainer");
        });

        if (!relayCreateContainer) {
          return;
        }

        const reactClassName = relayCreateContainer.node.arguments[0].name;
        const typeName = state.opts.extra.classPropTypes && state.opts.extra.classPropTypes[reactClassName];
        if (!typeName) {
          throw new Error(`React class ${reactClassName} does not have flow typed props`);
        }

        const type = state.opts.extra.flowTypes && state.opts.extra.flowTypes[typeName];
        if (!type) {
          throw new Error(`There is no flow type with name ${typeName}`);
        }

        const fragmentKey = t.isProperty(parent) && parent.key.name;
        const typeProperties = type.right.properties;

        let typeAtKey = null;
        for (let i = 0; i < typeProperties.length; i++) {
          const typeProperty = typeProperties[i];
          if (t.isObjectTypeProperty(typeProperty) && typeProperty.key.name === fragmentKey) {
            typeAtKey = typeProperty.value;
          }
        }

        if (!typeAtKey) {
          throw new Error(`There is no property named '${fragmentKey}' in flow type ${typeName}`);
        }

        const obj = t.isObjectTypeAnnotation(typeAtKey) ? convertFlowObjectTypeAnnotation(typeAtKey) : {};
        const graphQlQueryBody = convertToGraphQLString(obj);

        const childRelayContainers = state.opts.extra.relayContainerFragments || {};
        const childRelayContainersForFragment = Object.keys(childRelayContainers).reduce((c, name) => {
          const fragmentKeys = childRelayContainers[name];
          if (fragmentKeys.indexOf(fragmentKey) >= 0) {
            c.push(name);
          }
          return c;
        }, []);

        const fragmentName = node.arguments[1] && node.arguments[1].value || uppercaseFirstChar(fragmentKey);
        let graphQlQuery = "\n" +
          "fragment on " + fragmentName + " {\n" +
          graphQlQueryBody;
        const graphQlQueryEnd = "\n}\n";

        if (childRelayContainersForFragment.length > 0) {
          if (graphQlQueryBody) {
            graphQlQuery = graphQlQuery + ",\n  ";
          }

          graphQlQuery = graphQlQuery + childRelayContainersForFragment
            .map(name => "${" + name + ".getFragment('" + fragmentKey + "')}")
            .join(",\n  ");
        }
        graphQlQuery = graphQlQuery + graphQlQueryEnd;

        this.replaceWithSourceString("() => Relay.QL`" + graphQlQuery + "`");
      }
    }
  });
}