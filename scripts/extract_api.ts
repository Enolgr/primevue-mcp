import * as fs from "fs";
import * as path from "path";
import ts from "typescript";

// Configuration
const PRIMEVUE_DIR = path.resolve("node_modules/primevue");
const OUTPUT_PATH = path.resolve("data/api.json");

// Type definitions
interface ComponentData {
  props: Record<string, string>;
  emits: Record<string, string>;
  slots: Record<string, string>;
}

type ComponentsMap = Record<string, ComponentData>;

/**
 * Extracts properties from a TypeScript interface
 */
function extractInterfaceProperties(
  sourceFile: ts.SourceFile, 
  interfaceName: string
): Record<string, string> {
  const properties: Record<string, string> = {};
  
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const name = member.name.getText(sourceFile);
          const type = member.type ? member.type.getText(sourceFile) : "any";
          properties[name] = type;
        }
      }
    }
  });
  
  return properties;
}

/**
 * Extracts emits from XXXEmitsOptions interface
 */
function extractEmitsFromInterface(
  sourceFile: ts.SourceFile, 
  pascalName: string
): Record<string, string> {
  const emits: Record<string, string> = {};
  const interfaceName = `${pascalName}EmitsOptions`;
  
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      for (const member of node.members) {
        if ((ts.isPropertySignature(member) || ts.isMethodSignature(member)) && member.name) {
          const name = member.name.getText(sourceFile);
          const type = member.type ? member.type.getText(sourceFile) : "any";
          emits[name] = type;
        }
      }
    }
  });
  
  return emits;
}

/**
 * Extracts emits from EmitFn<{...}> type definitions
 */
function extractEmitsFromTypeAlias(
  sourceFile: ts.SourceFile, 
  pascalName: string
): Record<string, string> {
  const emits: Record<string, string> = {};
  const typeName = `${pascalName}Emits`;
  
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) {
      if (ts.isTypeReferenceNode(node.type) && 
          ts.isIdentifier(node.type.typeName) && 
          node.type.typeName.text === 'EmitFn') {
        
        if (node.type.typeArguments && node.type.typeArguments.length > 0) {
          const typeArg = node.type.typeArguments[0];
          if (ts.isTypeLiteralNode(typeArg)) {
            for (const member of typeArg.members) {
              if ((ts.isPropertySignature(member) || ts.isMethodSignature(member)) && member.name) {
                const name = member.name.getText(sourceFile);
                const type = member.type ? member.type.getText(sourceFile) : "any";
                emits[name] = type;
              }
            }
          }
        }
      }
    }
  });
  
  return emits;
}

/**
 * Extracts emits from both XXXEmitsOptions interface and EmitFn<{...}> type
 */
function extractEmits(sourceFile: ts.SourceFile, pascalName: string): Record<string, string> {
  const interfaceEmits = extractEmitsFromInterface(sourceFile, pascalName);
  const typeAliasEmits = extractEmitsFromTypeAlias(sourceFile, pascalName);
  
  return { ...interfaceEmits, ...typeAliasEmits };
}

/**
 * Maps directory names to PascalCase component names
 */
const COMPONENT_NAME_MAP: Record<string, string> = {
  'inputtext': 'InputText',
  'datatable': 'DataTable',
  'inputnumber': 'InputNumber',
  'inputmask': 'InputMask',
  'inputswitch': 'InputSwitch',
  'inputotp': 'InputOtp',
  'inputchips': 'InputChips',
  'inputgroup': 'InputGroup',
  'inputgroupaddon': 'InputGroupAddon',
  'inputicon': 'InputIcon',
  'accordioncontent': 'AccordionContent',
  'accordionheader': 'AccordionHeader',
  'accordionpanel': 'AccordionPanel',
  'accordiontab': 'AccordionTab',
  'avatargroup': 'AvatarGroup',
  'buttongroup': 'ButtonGroup',
  'checkboxgroup': 'CheckboxGroup',
  'radiobuttongroup': 'RadioButtonGroup',
  'columngroup': 'ColumnGroup',
  'confirmdialog': 'ConfirmDialog',
  'confirmpopup': 'ConfirmPopup',
  'contextmenu': 'ContextMenu',
  'dataview': 'DataView',
  'datepicker': 'DatePicker',
  'deferredcontent': 'DeferredContent',
  'dynamicdialog': 'DynamicDialog',
  'dynamicdialogoptions': 'DynamicDialogOptions',
  'floatlabel': 'FloatLabel',
  'imagecompare': 'ImageCompare',
  'inlinemessage': 'InlineMessage',
  'multiselect': 'MultiSelect',
  'orderlist': 'OrderList',
  'organizationchart': 'OrganizationChart',
  'overlaybadge': 'OverlayBadge',
  'overlaypanel': 'OverlayPanel',
  'panelmenu': 'PanelMenu',
  'picklist': 'PickList',
  'progressspinner': 'ProgressSpinner',
  'radiobutton': 'RadioButton',
  'scrollpanel': 'ScrollPanel',
  'scrolltop': 'ScrollTop',
  'selectbutton': 'SelectButton',
  'speeddial': 'SpeedDial',
  'splitbutton': 'SplitButton',
  'splitterpanel': 'SplitterPanel',
  'steplist': 'StepList',
  'steppanel': 'StepPanel',
  'steppanels': 'StepPanels',
  'tablist': 'TabList',
  'tabmenu': 'TabMenu',
  'tabpanel': 'TabPanel',
  'tabpanels': 'TabPanels',
  'tabview': 'TabView',
  'terminalservice': 'TerminalService',
  'toastservice': 'ToastService',
  'togglebutton': 'ToggleButton',
  'toggleswitch': 'ToggleSwitch'
};

/**
 * Converts directory name to PascalCase component name
 */
function getPascalCaseName(dirName: string): string {
  return COMPONENT_NAME_MAP[dirName] || dirName.charAt(0).toUpperCase() + dirName.slice(1);
}

/**
 * Finds the TypeScript definition file for a component
 */
function findDefinitionFile(componentPath: string, componentName: string): string | null {
  const possibleFiles = [
    path.join(componentPath, "index.d.ts"),
    path.join(componentPath, `${componentName}.d.ts`)
  ];
  
  return possibleFiles.find(file => fs.existsSync(file)) || null;
}

/**
 * Extracts component data from a TypeScript definition file
 */
function extractComponentData(sourceFile: ts.SourceFile, pascalName: string): ComponentData {
  const props = extractInterfaceProperties(sourceFile, `${pascalName}Props`);
  const slots = extractInterfaceProperties(sourceFile, `${pascalName}Slots`);
  const emits = extractEmits(sourceFile, pascalName);
  
  return { props, emits, slots };
}

/**
 * Processes all PrimeVue components and extracts their API data
 */
function extractAllComponents(): ComponentsMap {
  const components: ComponentsMap = {};
  
  for (const dirName of fs.readdirSync(PRIMEVUE_DIR)) {
    const componentPath = path.join(PRIMEVUE_DIR, dirName);
    
    // Skip if not a directory
    if (!fs.statSync(componentPath).isDirectory()) continue;
    
    // Find definition file
    const definitionFile = findDefinitionFile(componentPath, dirName);
    if (!definitionFile) continue;
    
    // Parse TypeScript file
    const sourceCode = fs.readFileSync(definitionFile, "utf8");
    const sourceFile = ts.createSourceFile(definitionFile, sourceCode, ts.ScriptTarget.Latest, true);
    
    // Extract component data
    const pascalName = getPascalCaseName(dirName);
    const componentData = extractComponentData(sourceFile, pascalName);
    
    components[dirName] = componentData;
  }
  
  return components;
}

/**
 * Main execution function
 */
function main(): void {
  console.log("🔍 Extracting PrimeVue component APIs...");
  
  const components = extractAllComponents();
  
  // Write results to file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(components, null, 2));
  
  console.log(`✅ Successfully extracted ${Object.keys(components).length} components`);
  console.log(`📁 Output written to: ${OUTPUT_PATH}`);
}

// Execute main function
main();
