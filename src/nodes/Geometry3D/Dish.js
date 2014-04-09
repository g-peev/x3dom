/*
 * X3DOM JavaScript Library
 * http://www.x3dom.org
 *
 * (C)2009 Fraunhofer IGD, Darmstadt, Germany
 * Dual licensed under the MIT and GPL
 */

/* ### Dish ### */
x3dom.registerNodeType(
    "Dish",
    "Geometry3D",
    defineClass(x3dom.nodeTypes.X3DSpatialGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.Dish.superClass.call(this, ctx);

            this.addField_SFFloat(ctx, 'diameter', 2); 	//Diameter of base
            this.addField_SFFloat(ctx, 'height', 1);	//Maximum height of dished surface above base (section if < r)
            this.addField_SFFloat(ctx, 'radius', this._vf.diameter / 2);  //Third semi-principal axes of ellipsoid
            this.addField_SFBool(ctx, 'bottom', true);
            this.addField_SFVec2f(ctx, 'subdivision', 24, 24);

            this.rebuildGeometry();
        },
        {
            rebuildGeometry: function()
            {
                this._mesh._positions[0] = [];
                this._mesh._normals[0]   = [];
                this._mesh._texCoords[0] = [];
                this._mesh._indices[0]   = [];

                var twoPi = Math.PI * 2, halfPi = Math.PI / 2;
                var halfDia = this._vf.diameter / 2;

                // If r is 0 or half of diameter, treat as section of sphere, else half of ellipsoid
                var r = this._vf.radius;
                r = (r == 0 || Math.abs(halfDia - r) <= x3dom.fields.Eps) ? halfDia : r;

                // height defines sectional part taken from half of ellipsoid (sphere if r==halfDia)
                var h = Math.min(this._vf.height, r);
                var offset = r - h;

                var a = halfDia;    // 1st semi-principal axes along x
                var b = r;          // 2nd semi-principal axes along y
                var c = halfDia;    // 3rd semi-principal axes along z

                var latitudeBands = this._vf.subdivision.x, longitudeBands = this._vf.subdivision.y;
                var latNumber, longNumber;

                var segTheta = halfPi - Math.asin(1 - h / r);
                var segL = Math.ceil(latitudeBands / halfPi * segTheta);

                var theta, sinTheta, cosTheta;
                var phi, sinPhi, cosPhi;
                var x, y, z, u, v;
                var tmpPosArr = [], tmpTcArr = [];

                for (latNumber = 0; latNumber <= latitudeBands; latNumber++) {
                    if (segL == latNumber) {
                        theta = segTheta;
                    }
                    else {
                        theta = (latNumber * halfPi) / latitudeBands;
                    }
                    sinTheta = Math.sin(theta);
                    cosTheta = Math.cos(theta);

                    for (longNumber = 0; longNumber <= longitudeBands; longNumber++) {
                        phi = (longNumber * twoPi) / longitudeBands;
                        sinPhi = Math.sin(phi);
                        cosPhi = Math.cos(phi);

                        x = a * (-cosPhi * sinTheta);
                        y = b *            cosTheta;
                        z = c * (-sinPhi * sinTheta);

                        u = 0.25 - (longNumber / longitudeBands);
                        v = latNumber / latitudeBands;

                        this._mesh._positions[0].push(x, y - offset, z);
                        this._mesh._texCoords[0].push(u, v);
                        this._mesh._normals[0].push(x/(a*a), y/(b*b), z/(c*c));

                        if ((latNumber == latitudeBands) || (segL == latNumber)) {
                            tmpPosArr.push(x, y - offset, z);
                            tmpTcArr.push(u, v);
                        }
                    }

                    if (segL == latNumber)
                        break;
                }

                for (latNumber = 0; latNumber < latitudeBands; latNumber++) {
                    if (segL == latNumber)
                        break;

                    for (longNumber = 0; longNumber < longitudeBands; longNumber++) {
                        var first = (latNumber * (longitudeBands + 1)) + longNumber;
                        var second = first + longitudeBands + 1;

                        this._mesh._indices[0].push(first + 1);
                        this._mesh._indices[0].push(second);
                        this._mesh._indices[0].push(first);

                        this._mesh._indices[0].push(first + 1);
                        this._mesh._indices[0].push(second + 1);
                        this._mesh._indices[0].push(second);
                    }
                }

                if (this._vf.bottom)
                {
                    var origPos = this._mesh._positions[0].length / 3;
                    var t = origPos + 1;

                    for (var i=0, m=tmpPosArr.length/3; i<m; i++) {
                        var j = 3 * i;
                        this._mesh._positions[0].push(tmpPosArr[j  ]);
                        this._mesh._positions[0].push(tmpPosArr[j+1]);
                        this._mesh._positions[0].push(tmpPosArr[j+2]);
                        j = 2 * i;
                        this._mesh._texCoords[0].push(tmpTcArr[j  ]);
                        this._mesh._texCoords[0].push(tmpTcArr[j+1]);
                        this._mesh._normals[0].push(0, -1, 0);

                        if (i >= 2) {
                            this._mesh._indices[0].push(origPos);
                            this._mesh._indices[0].push(t);

                            t = origPos + i;
                            this._mesh._indices[0].push(t);
                        }
                    }
                }

                this.invalidateVolume();
                this._mesh._numFaces = this._mesh._indices[0].length / 3;
                this._mesh._numCoords = this._mesh._positions[0].length / 3;
            },

            fieldChanged: function(fieldName)
            {
                if (fieldName == "radius" || fieldName == "height" || fieldName == "diameter" ||
                    fieldName == "subdivision" || fieldName == "bottom")
                {
                    this.rebuildGeometry();

                    Array.forEach(this._parentNodes, function (node) {
                        node.setAllDirty();
                        node.invalidateVolume();
                    });
                }
            }
        }
    )
);