import { RunTaskAsync } from '../engine/core/taskrunner.js';
import { SubCoord3D } from '../engine/geometry/coord3d.js';
import { GetBoundingBox, IsSolid } from '../engine/model/modelutils.js';
import { CalculateVolume, CalculateSurfaceArea } from '../engine/model/quantities.js';
import { Property, PropertyType } from '../engine/model/property.js';
import { AddDiv, AddDomElement, ClearDomElement } from '../engine/viewer/domutils.js';
import { SidebarPanel } from './sidebarpanel.js';
import { CreateInlineColorCircle } from './utils.js';
import { GetFileName } from '../engine/io/fileutils.js';
import { MaterialType } from '../engine/model/material.js';
import { ColorToHexString } from '../engine/model/color.js';
import {localize} from "../i18n/locale";

export class SidebarDetailsPanel extends SidebarPanel
{
    constructor (parentDiv)
    {
        super (parentDiv);
    }

    GetName ()
    {
        return localize('details', 'Details');
    }

    GetIcon ()
    {
        return 'details';
    }

    AddObject3DProperties (object3D)
    {
        this.Clear ();
        let table = AddDiv (this.contentDiv, 'ov_property_table');
        let boundingBox = GetBoundingBox (object3D);
        let size = SubCoord3D (boundingBox.max, boundingBox.min);
        this.AddProperty (table, new Property (PropertyType.Integer, localize('vertices', 'Vertices'), object3D.VertexCount ()));
        this.AddProperty (table, new Property (PropertyType.Integer, localize('triangles', 'Triangles'), object3D.TriangleCount ()));
        this.AddProperty (table, new Property (PropertyType.Number, localize('sizeX', 'Size X'), size.x));
        this.AddProperty (table, new Property (PropertyType.Number, localize('sizeY', 'Size Y'), size.y));
        this.AddProperty (table, new Property (PropertyType.Number, localize('sizeZ','Size Z'), size.z));
        this.AddCalculatedProperty (table, localize('volume', 'Volume'), () => {
            if (!IsSolid (object3D)) {
                return null;
            }
            const volume = CalculateVolume (object3D);
            return new Property (PropertyType.Number, null, volume);
        });
        this.AddCalculatedProperty (table, localize('surface', 'Surface'), () => {
            const surfaceArea = CalculateSurfaceArea (object3D);
            return new Property (PropertyType.Number, null, surfaceArea);
        });
        if (object3D.PropertyGroupCount () > 0) {
            let customTable = AddDiv (this.contentDiv, 'ov_property_table ov_property_table_custom');
            for (let i = 0; i < object3D.PropertyGroupCount (); i++) {
                const propertyGroup = object3D.GetPropertyGroup (i);
                this.AddPropertyGroup (customTable, propertyGroup);
                for (let j = 0; j < propertyGroup.PropertyCount (); j++) {
                    const property = propertyGroup.GetProperty (j);
                    this.AddPropertyInGroup (customTable, property);
                }
            }
        }
        this.Resize ();
    }

    AddMaterialProperties (material)
    {
        function AddTextureMap (obj, table, name, map)
        {
            if (map === null || map.name === null) {
                return;
            }
            let fileName = GetFileName (map.name);
            obj.AddProperty (table, new Property (PropertyType.Text, name, fileName));
        }

        this.Clear ();
        let table = AddDiv (this.contentDiv, 'ov_property_table');
        let typeString = null;
        if (material.type === MaterialType.Phong) {
            typeString = 'Phong';
        } else if (material.type === MaterialType.Physical) {
            typeString = 'Physical';
        }
        this.AddProperty (table, new Property (PropertyType.Text, localize('source', 'Source'), material.isDefault ? localize('default', 'Default') : localize('model', 'Model')));
        this.AddProperty (table, new Property (PropertyType.Text, localize('type', 'Type'), typeString));
        if (material.vertexColors) {
            this.AddProperty (table, new Property (PropertyType.Text, localize('color', 'Color'), localize('vertexColors', 'Vertex colors')));
        } else {
            this.AddProperty (table, new Property (PropertyType.Color, localize('color', 'Color'), material.color));
            if (material.type === MaterialType.Phong) {
                this.AddProperty (table, new Property (PropertyType.Color, localize('ambient', 'Ambient'), material.ambient));
                this.AddProperty (table, new Property (PropertyType.Color, localize('specular', 'Specular'), material.specular));
            }
        }
        if (material.type === MaterialType.Physical) {
            this.AddProperty (table, new Property (PropertyType.Percent, localize('metalness', 'Metalness'), material.metalness));
            this.AddProperty (table, new Property (PropertyType.Percent, localize('roughness', 'Roughness'), material.roughness));
        }
        this.AddProperty (table, new Property (PropertyType.Percent, localize('opacity', 'Opacity'), material.opacity));
        AddTextureMap (this, table, localize('diffuseMap', 'Diffuse Map'), material.diffuseMap);
        AddTextureMap (this, table, localize('bumpMap', 'Bump Map'), material.bumpMap);
        AddTextureMap (this, table, localize('normalMap', 'Normal Map'), material.normalMap);
        AddTextureMap (this, table, localize('emissiveMap', 'Emissive Map'), material.emissiveMap);
        if (material.type === MaterialType.Phong) {
            AddTextureMap (this, table, localize('specularMap', 'Specular Map'), material.specularMap);
        } else if (material.type === MaterialType.Physical) {
            AddTextureMap (this, table, localize('metallicMap', 'Metallic Map'), material.metalnessMap);
        }
        this.Resize ();
    }

    AddPropertyGroup (table, propertyGroup)
    {
        let row = AddDiv (table, 'ov_property_table_row group', propertyGroup.name);
        row.setAttribute ('title', propertyGroup.name);
    }

    AddProperty (table, property)
    {
        let row = AddDiv (table, 'ov_property_table_row');
        let nameColumn = AddDiv (row, 'ov_property_table_cell ov_property_table_name', property.name + ':');
        let valueColumn = AddDiv (row, 'ov_property_table_cell ov_property_table_value');
        nameColumn.setAttribute ('title', property.name);
        this.DisplayPropertyValue (property, valueColumn);
        return row;
    }

    AddPropertyInGroup (table, property)
    {
        let row = this.AddProperty (table, property);
        row.classList.add ('ingroup');
    }

    AddCalculatedProperty (table, name, calculateValue)
    {
        let row = AddDiv (table, 'ov_property_table_row');
        let nameColumn = AddDiv (row, 'ov_property_table_cell ov_property_table_name', name + ':');
        let valueColumn = AddDiv (row, 'ov_property_table_cell ov_property_table_value');
        nameColumn.setAttribute ('title', name);

        let calculateButton = AddDiv (valueColumn, 'ov_property_table_button', localize('calculate', 'Calculate...'));
        calculateButton.addEventListener ('click', () => {
            ClearDomElement (valueColumn);
            valueColumn.innerHTML = localize('pleaseWait', 'Please wait...');
            RunTaskAsync (() => {
                let propertyValue = calculateValue ();
                if (propertyValue === null) {
                    valueColumn.innerHTML = '-';
                } else {
                    this.DisplayPropertyValue (propertyValue, valueColumn);
                }
            });
        });
    }

    DisplayPropertyValue (property, targetDiv)
    {
        ClearDomElement (targetDiv);
        let valueText = null;
        if (property.type === PropertyType.Text) {
            valueText = property.value;
        } else if (property.type === PropertyType.Integer) {
            valueText = property.value.toLocaleString ();
        } else if (property.type === PropertyType.Number) {
            valueText = property.value.toLocaleString (undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else if (property.type === PropertyType.Boolean) {
            valueText = property.value ? localize('true', 'True') : localize('false', 'False');
        } else if (property.type === PropertyType.Percent) {
            valueText = parseInt (property.value * 100, 10).toString () + '%';
        } else if (property.type === PropertyType.Color) {
            let hexString = '#' + ColorToHexString (property.value);
            let colorCircle = CreateInlineColorCircle (property.value);
            targetDiv.appendChild (colorCircle);
            AddDomElement (targetDiv, 'span', null, hexString);
        }
        if (valueText !== null) {
            targetDiv.innerHTML = valueText;
            targetDiv.setAttribute ('title', valueText);
        }
    }
}
