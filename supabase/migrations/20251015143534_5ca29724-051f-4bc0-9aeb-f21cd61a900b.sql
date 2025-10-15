-- Mettre à jour le template HTML actif pour utiliser client_full_address
UPDATE html_templates
SET html_content = REPLACE(
  html_content,
  '<div style="font-size: 14px; color: #999; margin-top: 5px;">{{client_address}}</div>',
  '<div style="font-size: 14px; color: #999; margin-top: 5px; white-space: pre-line;">{{client_full_address}}</div>'
),
updated_at = now()
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
AND is_active = true;

-- Mettre à jour le template HTML actif pour ajouter la boucle sur les équipements
UPDATE html_templates
SET html_content = REPLACE(
  html_content,
  '<tbody>
                                <tr>
                                    <td>{{category}}</td>
                                    <td>{{description}}</td>
                                    <td style="text-align: center;">{{quantity}}</td>
                                </tr>
                                <!-- Ajoutez plus de lignes si nécessaire :
                                <tr>
                                    <td>{{category2}}</td>
                                    <td>{{description2}}</td>
                                    <td style="text-align: center;">{{quantity2}}</td>
                                </tr>
                                -->
                            </tbody>',
  '<tbody>
                                {{#each products}}
                                <tr>
                                    <td>{{this.category}}</td>
                                    <td>{{this.description}}</td>
                                    <td style="text-align: center;">{{this.quantity}}</td>
                                </tr>
                                {{/each}}
                                {{#unless products}}
                                <tr>
                                    <td colspan="3" style="text-align: center; color: #999; padding: 20px;">Aucun équipement spécifié</td>
                                </tr>
                                {{/unless}}
                            </tbody>'
),
updated_at = now()
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'
AND is_active = true;