const fs = require('fs');
let html = fs.readFileSync('tribes-interface.html', 'utf8');

const regex = /createIgnoreInterface\(container\) \{[\s\S]*?group\.appendChild\(ignoreContainer\);\s+container\.appendChild\(group\);\s+\}/;

const newCode = `createUnifiedGuardInterface(container) {
                const currentPlayerName = document.getElementById('playerName').value;
                if (!this.currentChildren || !currentPlayerName || !this.currentPopulation) {
                    container.innerHTML = '<div style="color: #6c757d; font-style: italic;">Loading children data...</div>';
                    this.send({ type: 'infoRequest', selection: 'children' });
                    return;
                }
                
                const group = document.createElement('div');
                group.className = 'parameter-group';
                
                const label = document.createElement('label');
                label.textContent = 'Children you can guard:';
                group.appendChild(label);

                const warningMsg = document.createElement('div');
                warningMsg.id = 'guardLimitWarning';
                warningMsg.style.color = '#721c24';
                warningMsg.style.backgroundColo                warningMsg.style.backgroundColo      ng = '0.5rem';
                warningMsg.style.borderRadius = '4px';
                warnin                warnin                warnin                warnin                warnin                      warnin                warnin                warnin                warnin                warnin           ');
                warnin                warnin                warnin                             warnin     '  ram_child';
                                                                              cons                                                   ye                        const guardedNames = (currentPlayer && currentPlayer.guarding) ? currentPlayer.guarding : [];
                
                Object.keys(this.currentChildren).forEach(childName => {
                    const child = this.currentChildren[childName];
                    if (child.age >= 0 && child.age < 23) {
                                                                                                                                                                                             if                                                                                                                                                                                              if                                                tyle="margin-bottom: 0.5rem; font-weight: 600;">Set status:</div>';
                    
                    eligibleChildr                    eligibleChildr                    eligibleChildr                    eligibleChildr                    eligibleChildr                    eligibleChildr                    eligibleChildr                    eligibleChildr            fle                                     eligibleChildr                    eligibleChildr  -co                    eligibleChildr                    eligibleCem;
                    eligibleChildr                    elig                     border: 1px solid #ddd;
                            border-radius: 4px;
                            background: #f8f9fa;
                        \`;
                        
                        const childLabel = document.createElement('span');
                        childLabel.textContent = \`\${child.name} (age \${child.age})\`;
                        childLabel.style.fontWeight = '500';
                        
                        const radioGroup = document.createElement('div');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              value = 'guard';
                        guardRadio.chec                        guardRadio.chec         const ignoreOption = document.createElement('label');
                        ignoreOption.style.cssText = 'display: flex; align-items: center; gap: 0.25rem; cursor: pointer;';
                        const ignoreRadio = document.createElement('input');
                        ignoreRadio.type = 'radio';
                        ignoreRadio.name = \`unified_guard_\${child.name}\`;
                        ignoreRadio.value = 'ignore';
                        ignoreRadio.checked = !child.isGuarded;

                        const validateLimits = () => {
                            const allChecked = guardContainer.querySelectorAll('input[type="radio"][value="guard"]:checked');
                            const execBtn = document.getElementById('modalExecuteBtn');
                            if (allChecked.length > 4) {
                                if (execBtn) execBtn.disabled = true;
                                warning                                warning                                warning                                warning                      om                                warning                                warning                                warning  bled                                warning                                wae';
                            }
                                                                                                 eL                                                  ntLi                                                              rdO                                                                                                                                                        eL                         en                                                                                      extNode('Ignore'));
                        
                                                                                     radioGroup.appendChild(ignoreOption);
                        
                        childDiv.appendChild(childLabel);
                        childDiv.appendChild(radioGroup);
                        guardContainer.appendChild(childDiv);
                    });
                }
                
                group.appendChild(guardContainer);
                container.ap                con                           container.ap                con                           container.ap                con                           container.ap                con                           container.ap                con                           container.ap                con                           container.ap                con                           container.ap                con                           container.ap                con                           container.ap           to                containor                container.ap                con                           container.ap                con                
                                                                                  )                                                         il                                                           ess                     Ign                h             dGuardInterface');
} else {
    console.log('Regex matched nothing :(');
    // dump around createIgnoreInterface
    console.log("Here is what we have:", html.substring(html.indexOf("createIgnoreInterface"), html.indexOf("createIgnoreInterface") + 200));
}
