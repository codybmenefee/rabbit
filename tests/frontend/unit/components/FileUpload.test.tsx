import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../../../../frontend/src/components/FileUpload';

// Mock the useDropzone hook
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn()
}));

describe('FileUpload Component', () => {
  const mockOnFileSelect = jest.fn();
  const mockUseDropzone = require('react-dropzone').useDropzone;

  beforeEach(() => {
    mockOnFileSelect.mockClear();
    
    // Default mock implementation
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({
        'data-testid': 'dropzone',
        onClick: jest.fn(),
      }),
      getInputProps: () => ({
        'data-testid': 'file-input',
        type: 'file',
      }),
      isDragActive: false,
      isDragReject: false,
      isDragAccept: false,
    });
  });

  describe('Rendering', () => {
    test('renders upload area correctly', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      expect(screen.getByTestId('dropzone')).toBeInTheDocument();
      expect(screen.getByTestId('file-input')).toBeInTheDocument();
      expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
      expect(screen.getByText(/browse/i)).toBeInTheDocument();
    });

    test('displays correct file format information', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      expect(screen.getByText(/html/i)).toBeInTheDocument();
      expect(screen.getByText(/youtube.*takeout/i)).toBeInTheDocument();
    });

    test('shows file size limit', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      expect(screen.getByText(/100.*mb/i)).toBeInTheDocument();
    });
  });

  describe('Drag and Drop States', () => {
    test('shows active drag state', () => {
      mockUseDropzone.mockReturnValue({
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: true,
        isDragReject: false,
        isDragAccept: false,
      });

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      expect(dropzone).toHaveClass('border-blue-500'); // Assuming this class is applied
    });

    test('shows accept drag state', () => {
      mockUseDropzone.mockReturnValue({
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
        isDragReject: false,
        isDragAccept: true,
      });

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      expect(dropzone).toHaveClass('border-green-500'); // Assuming this class is applied
    });

    test('shows reject drag state', () => {
      mockUseDropzone.mockReturnValue({
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
        isDragReject: true,
        isDragAccept: false,
      });

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      expect(dropzone).toHaveClass('border-red-500'); // Assuming this class is applied
    });
  });

  describe('File Selection', () => {
    test('handles valid file selection', async () => {
      const mockFile = new File(['<html>content</html>'], 'watch-history.html', {
        type: 'text/html'
      });

      mockUseDropzone.mockImplementation(({ onDrop }) => ({
        getRootProps: () => ({
          'data-testid': 'dropzone',
          onClick: () => onDrop([mockFile]),
        }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
        isDragReject: false,
        isDragAccept: false,
      }));

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      fireEvent.click(dropzone);

      await waitFor(() => {
        expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile);
      });
    });

    test('handles file input change event', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['<html>content</html>'], 'watch-history.html', {
        type: 'text/html'
      });

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const fileInput = screen.getByTestId('file-input');
      await user.upload(fileInput, mockFile);

      expect(mockOnFileSelect).toHaveBeenCalledWith(mockFile);
    });

    test('validates file type', async () => {
      const invalidFile = new File(['content'], 'document.txt', {
        type: 'text/plain'
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockUseDropzone.mockImplementation(({ onDrop }) => ({
        getRootProps: () => ({
          'data-testid': 'dropzone',
          onClick: () => onDrop([invalidFile]),
        }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
        isDragReject: false,
        isDragAccept: false,
      }));

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      fireEvent.click(dropzone);

      await waitFor(() => {
        expect(mockOnFileSelect).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    test('validates file size', async () => {
      // Create a file larger than 100MB
      const largeFile = new File(['x'.repeat(105 * 1024 * 1024)], 'large-file.html', {
        type: 'text/html'
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockUseDropzone.mockImplementation(({ onDrop }) => ({
        getRootProps: () => ({
          'data-testid': 'dropzone',
          onClick: () => onDrop([largeFile]),
        }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
        isDragReject: false,
        isDragAccept: false,
      }));

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      fireEvent.click(dropzone);

      await waitFor(() => {
        expect(mockOnFileSelect).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('handles multiple files gracefully', async () => {
      const file1 = new File(['content1'], 'file1.html', { type: 'text/html' });
      const file2 = new File(['content2'], 'file2.html', { type: 'text/html' });

      mockUseDropzone.mockImplementation(({ onDrop }) => ({
        getRootProps: () => ({
          'data-testid': 'dropzone',
          onClick: () => onDrop([file1, file2]),
        }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
        isDragReject: false,
        isDragAccept: false,
      }));

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      fireEvent.click(dropzone);

      await waitFor(() => {
        // Should only process the first file
        expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
        expect(mockOnFileSelect).toHaveBeenCalledWith(file1);
      });
    });

    test('displays error message for invalid files', async () => {
      const invalidFile = new File(['content'], 'document.pdf', {
        type: 'application/pdf'
      });

      mockUseDropzone.mockImplementation(({ onDrop }) => ({
        getRootProps: () => ({
          'data-testid': 'dropzone',
          onClick: () => onDrop([invalidFile]),
        }),
        getInputProps: () => ({ 'data-testid': 'file-input' }),
        isDragActive: false,
        isDragReject: false,
        isDragAccept: false,
      }));

      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      fireEvent.click(dropzone);

      await waitFor(() => {
        expect(screen.getByText(/invalid.*file.*type/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('aria-label');
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      
      // Should be focusable
      await user.tab();
      expect(dropzone).toHaveFocus();
      
      // Should activate on Enter
      await user.keyboard('{Enter}');
      // This would trigger file selection in a real browser
    });

    test('has proper role attributes', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      const dropzone = screen.getByTestId('dropzone');
      expect(dropzone).toHaveAttribute('role', 'button');
    });
  });

  describe('Loading States', () => {
    test('shows loading state when processing', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} isLoading={true} />);
      
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
      expect(screen.getByTestId('dropzone')).toHaveAttribute('aria-disabled', 'true');
    });

    test('disables interaction during loading', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} isLoading={true} />);
      
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toBeDisabled();
    });
  });

  describe('Progress Indicator', () => {
    test('shows upload progress when provided', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} uploadProgress={45} />);
      
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('hides progress when not uploading', () => {
      render(<FileUpload onFileSelect={mockOnFileSelect} />);
      
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
});