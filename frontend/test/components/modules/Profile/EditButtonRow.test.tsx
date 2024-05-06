/*import { expect } from 'chai';
import { render, fireEvent, screen } from '@testing-library/react';
import EditButtonRow from '../../../../src/components/modules/Profile/EditInfoButtonRow';

describe('EditButtonRow', () => {
  it('renders correctly when editing is disabled', () => {
    const setEditingEnabledMock = jest.fn();
    const formContextMock = {
      reset: jest.fn(),
      formState: { isDirty: true } // Mock formState as needed
    };

    render(
      <EditButtonRow
        editingEnabled={false}
        setEditingEnabled={setEditingEnabledMock}
        formContext={formContextMock}
      />
    );

    // Assert that the edit button is rendered
    expect(screen.getByText('Edit Info')).to.exist;

    // Assert that the cancel and save buttons are not rendered
    expect(screen.queryByText('Cancel')).to.not.exist;
    expect(screen.queryByText('Save Info')).to.not.exist;
  });
});*/