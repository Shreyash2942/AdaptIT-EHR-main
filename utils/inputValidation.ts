// Description: Utility functions for input validation in AdaptIT

/*
    * validateValidInput
    * Checks if the input value is valid (not undefined, null, empty or white space).
    * @param value - The input value to validate.
    * @return boolean - Returns true if the input is valid, false otherwise.
*/
export function validateValidInput(value: any): boolean {
    return value !== undefined && value !== null && value !== '' && value.toString().trim() !== '';
}