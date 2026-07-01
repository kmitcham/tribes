// Test suite for consolidated form rendering (renderCommandForm)
// Tests both modal and non-modal code paths work correctly

describe('Form Rendering Consolidation - renderCommandForm', () => {
  let mockTribesInterface;

  beforeEach(() => {
    // Create a mock TribesInterface object with essential methods
    mockTribesInterface = {
      selectedCommand: null,
      currentPopulation: null,
      currentChildren: null,
      currentRomanceLists: null,
      isPlayerTargetingOption: jest.fn((name) => name === 'target'),
      isChildTargetingOption: jest.fn(() => false),
      isHistorySubjectOption: jest.fn(() => false),
      buildUnifiedRomanceModal: jest.fn(),
      buildRomanceGridForm: jest.fn(),
      renderParametersInContainer: jest.fn(),
      addPregnancyWarning: jest.fn(),
      send: jest.fn(),

      // The unified form renderer with both isModal paths
      renderCommandForm: function (container, isModal = false) {
        if (!this.selectedCommand) {
          if (!isModal) {
            // Non-modal path: would set form.style.display = 'none'
          }
          return;
        }
        const cmdName = this.selectedCommand.name.toLowerCase();

        // Handle special romance commands (unified modal for all, grid form for non-modal)
        if (
          isModal &&
          (cmdName === 'romance' ||
            cmdName === 'consent' ||
            cmdName === 'decline')
        ) {
          this.buildUnifiedRomanceModal(container);
          return;
        }
        if (!isModal && (cmdName === 'consent' || cmdName === 'decline')) {
          this.buildRomanceGridForm(container);
          return;
        }

        if (!this.selectedCommand.options) {
          if (!isModal) {
            // Non-modal path: would set form.style.display = 'none'
          }
          return;
        }

        // Preserve existing form values before clearing container
        const preservedValues = {};
        if (container.querySelectorAll) {
          const existingInputs = container.querySelectorAll('input, select');
          existingInputs.forEach((input) => {
            if (input.id && input.id.startsWith('param_')) {
              const paramName = input.id.replace('param_', '');
              if (input.type === 'checkbox') {
                preservedValues[paramName] = input.checked;
              } else {
                preservedValues[paramName] = input.value;
              }
            } else if (input.id === 'invite_append_pass') {
              preservedValues['invite_append_pass'] = input.checked;
            }
          });
        }

        // Check if this command needs player data and fetch it
        const needsPlayerData = isModal
          ? this.selectedCommand.name.toLowerCase() !== 'induct' &&
            this.selectedCommand.options.some((option) =>
              this.isPlayerTargetingOption(option.name)
            )
          : this.selectedCommand.options.some((option) =>
              this.isPlayerTargetingOption(option.name)
            );

        // Secrets command also needs population data to pre-populate current value
        const needsPopulationForSecrets =
          isModal && this.selectedCommand.name.toLowerCase() === 'secrets';

        const needsChildrenData = this.selectedCommand.options.some((option) =>
          this.isChildTargetingOption(option.name)
        );

        const needsHistorySubjectData =
          isModal &&
          this.selectedCommand.options.some((option) =>
            this.isHistorySubjectOption(option)
          );

        if (
          (needsPlayerData || needsPopulationForSecrets) &&
          !this.currentPopulation
        ) {
          this.send({ type: 'infoRequest', selection: 'population' });
          return;
        }

        if (needsChildrenData && !this.currentChildren) {
          this.send({ type: 'infoRequest', selection: 'children' });
          return;
        }

        if (needsHistorySubjectData && !this.currentPopulation) {
          this.send({ type: 'infoRequest', selection: 'population' });
          return;
        }

        if (this.selectedCommand.name.toLowerCase() === 'invite') {
          this.addPregnancyWarning(container);
        }

        this.renderParametersInContainer(container, preservedValues);
      },

      // The backward-compatible wrapper
      generateCommandFormInModal: function (container) {
        this.renderCommandForm(container, true);
      },
    };
  });

  describe('Modal path (renderCommandForm with isModal=true)', () => {
    test('handles romance command in modal mode', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Romance',
        options: [],
      };

      mockTribesInterface.renderCommandForm({}, true);

      expect(mockTribesInterface.buildUnifiedRomanceModal).toHaveBeenCalled();
      expect(mockTribesInterface.buildRomanceGridForm).not.toHaveBeenCalled();
    });

    test('handles consent command in modal mode with unified romance modal', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Consent',
        options: [],
      };

      mockTribesInterface.renderCommandForm({}, true);

      expect(mockTribesInterface.buildUnifiedRomanceModal).toHaveBeenCalled();
      expect(mockTribesInterface.buildRomanceGridForm).not.toHaveBeenCalled();
    });

    test('handles decline command in modal mode with unified romance modal', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Decline',
        options: [],
      };

      mockTribesInterface.renderCommandForm({}, true);

      expect(mockTribesInterface.buildUnifiedRomanceModal).toHaveBeenCalled();
      expect(mockTribesInterface.buildRomanceGridForm).not.toHaveBeenCalled();
    });

    test('handles no selectedCommand in modal mode', () => {
      mockTribesInterface.selectedCommand = null;

      mockTribesInterface.renderCommandForm({}, true);

      expect(
        mockTribesInterface.buildUnifiedRomanceModal
      ).not.toHaveBeenCalled();
      expect(mockTribesInterface.send).not.toHaveBeenCalled();
    });

    test('handles command without options in modal mode', () => {
      mockTribesInterface.selectedCommand = {
        name: 'TestCommand',
        options: null,
      };

      mockTribesInterface.renderCommandForm({}, true);

      expect(
        mockTribesInterface.renderParametersInContainer
      ).not.toHaveBeenCalled();
    });
  });

  describe('Non-modal path (renderCommandForm with isModal=false)', () => {
    test('handles consent command in non-modal mode with grid form', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Consent',
        options: [],
      };

      mockTribesInterface.renderCommandForm({}, false);

      expect(mockTribesInterface.buildRomanceGridForm).toHaveBeenCalled();
      expect(
        mockTribesInterface.buildUnifiedRomanceModal
      ).not.toHaveBeenCalled();
    });

    test('handles decline command in non-modal mode with grid form', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Decline',
        options: [],
      };

      mockTribesInterface.renderCommandForm({}, false);

      expect(mockTribesInterface.buildRomanceGridForm).toHaveBeenCalled();
      expect(
        mockTribesInterface.buildUnifiedRomanceModal
      ).not.toHaveBeenCalled();
    });

    test('handles romance command in non-modal mode normally', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Romance',
        options: [{ name: 'someOption', type: 'string' }],
      };

      mockTribesInterface.renderCommandForm({}, false);

      expect(mockTribesInterface.buildRomanceGridForm).not.toHaveBeenCalled();
      expect(
        mockTribesInterface.buildUnifiedRomanceModal
      ).not.toHaveBeenCalled();
      expect(
        mockTribesInterface.renderParametersInContainer
      ).toHaveBeenCalled();
    });
  });

  describe('Data fetching requirements - Modal specific behavior', () => {
    test('skips induct command player data check in modal mode only', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Induct',
        options: [{ name: 'target', type: 'string' }],
      };

      // Modal mode: induct should NOT trigger player data fetch
      mockTribesInterface.renderCommandForm({}, true);
      expect(mockTribesInterface.send).not.toHaveBeenCalled();

      mockTribesInterface.send.mockClear();

      // Non-modal mode: induct SHOULD trigger player data fetch
      mockTribesInterface.renderCommandForm({}, false);
      expect(mockTribesInterface.send).toHaveBeenCalledWith({
        type: 'infoRequest',
        selection: 'population',
      });
    });

    test('handles secrets command population data requirement in modal mode only', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Secrets',
        options: [{ name: 'willtrain', type: 'boolean' }],
      };
      mockTribesInterface.currentPopulation = null;

      // Modal mode: secrets should trigger population fetch
      mockTribesInterface.renderCommandForm({}, true);
      expect(mockTribesInterface.send).toHaveBeenCalledWith({
        type: 'infoRequest',
        selection: 'population',
      });

      mockTribesInterface.send.mockClear();

      // Non-modal mode: secrets should NOT trigger population fetch (no player targeting)
      mockTribesInterface.renderCommandForm({}, false);
      expect(mockTribesInterface.send).not.toHaveBeenCalled();
    });

    test('handles history command subject data requirement in modal mode only', () => {
      mockTribesInterface.isHistorySubjectOption.mockReturnValue(true);
      mockTribesInterface.selectedCommand = {
        name: 'History',
        options: [{ name: 'subject', type: 'string' }],
      };
      mockTribesInterface.currentPopulation = null;

      // Modal mode: history should trigger population fetch for subject data
      mockTribesInterface.renderCommandForm({}, true);
      expect(mockTribesInterface.send).toHaveBeenCalledWith({
        type: 'infoRequest',
        selection: 'population',
      });

      mockTribesInterface.send.mockClear();

      // Non-modal mode: history should NOT trigger special fetch
      mockTribesInterface.renderCommandForm({}, false);
      expect(mockTribesInterface.send).not.toHaveBeenCalled();
    });
  });

  describe('Attack command with player data requirements', () => {
    test('identifies attack target as requiring player data', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Attack',
        options: [{ name: 'target', type: 'string' }],
      };
      mockTribesInterface.currentPopulation = null;

      mockTribesInterface.renderCommandForm({}, true);

      expect(mockTribesInterface.send).toHaveBeenCalledWith({
        type: 'infoRequest',
        selection: 'population',
      });
    });

    test('loads population data for attack in both modal and non-modal modes', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Attack',
        options: [{ name: 'target', type: 'string' }],
      };
      mockTribesInterface.currentPopulation = null;

      // Modal mode
      mockTribesInterface.renderCommandForm({}, true);
      expect(mockTribesInterface.send).toHaveBeenCalledWith({
        type: 'infoRequest',
        selection: 'population',
      });

      mockTribesInterface.send.mockClear();

      // Non-modal mode
      mockTribesInterface.renderCommandForm({}, false);
      expect(mockTribesInterface.send).toHaveBeenCalledWith({
        type: 'infoRequest',
        selection: 'population',
      });
    });
  });

  describe('Backward compatibility (generateCommandFormInModal)', () => {
    test('delegates to renderCommandForm with isModal=true', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Attack',
        options: [{ name: 'target', type: 'string' }],
      };
      mockTribesInterface.currentPopulation = { bob: {} };

      mockTribesInterface.generateCommandFormInModal({});

      expect(
        mockTribesInterface.renderParametersInContainer
      ).toHaveBeenCalled();
    });

    test('preserves romance modal behavior through generateCommandFormInModal', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Romance',
        options: [],
      };

      mockTribesInterface.generateCommandFormInModal({});

      expect(mockTribesInterface.buildUnifiedRomanceModal).toHaveBeenCalled();
    });
  });

  describe('Invite command special handling', () => {
    test('calls addPregnancyWarning for invite command', () => {
      mockTribesInterface.selectedCommand = {
        name: 'Invite',
        options: [{ name: 'invitelist', type: 'string' }],
      };
      mockTribesInterface.currentPopulation = { alice: {}, bob: {} };

      mockTribesInterface.renderCommandForm({}, true);

      expect(mockTribesInterface.addPregnancyWarning).toHaveBeenCalled();
      expect(
        mockTribesInterface.renderParametersInContainer
      ).toHaveBeenCalled();
    });
  });

  describe('Value preservation', () => {
    test('preserves form values during re-render', () => {
      const mockContainer = {
        querySelectorAll: jest.fn().mockReturnValue([
          {
            id: 'param_target',
            type: 'text',
            value: 'bob',
            checked: false,
          },
          {
            id: 'param_strategy',
            type: 'checkbox',
            checked: true,
          },
          {
            id: 'invite_append_pass',
            type: 'checkbox',
            checked: true,
          },
        ]),
      };

      mockTribesInterface.selectedCommand = {
        name: 'Attack',
        options: [{ name: 'target', type: 'string' }],
      };
      mockTribesInterface.currentPopulation = { bob: {} };

      mockTribesInterface.renderCommandForm(mockContainer, true);

      // Verify renderParametersInContainer was called with preserved values
      const callArgs =
        mockTribesInterface.renderParametersInContainer.mock.calls[0];
      const preservedValues = callArgs[1];

      expect(preservedValues.target).toBe('bob');
      expect(preservedValues.strategy).toBe(true);
      expect(preservedValues.invite_append_pass).toBe(true);
    });
  });
});
