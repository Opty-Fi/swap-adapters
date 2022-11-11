// SPDX-License-Identifier: MIT

pragma solidity >0.6.0 <0.9.0;

/////////////////////////////////////////////////////
/// PLEASE DO NOT USE THIS CONTRACT IN PRODUCTION ///
/////////////////////////////////////////////////////

/**
 * @title MultiCall Contract
 * @author Opty.fi
 * @dev Provides functions used commonly for decoding codes and execute
 * the code calls for Opty.fi contracts
 */
abstract contract MultiCall {
    /**
     * @notice Executes any functionality and check if it is working or not
     * @dev Execute the code and revert with error message if code provided is incorrect
     * @param _code Encoded data in bytes which acts as code to execute
     */
    function executeCode(bytes memory _code, string memory) internal {
        (address _contract, bytes memory _data) = abi.decode(_code, (address, bytes));
        (bool _success, bytes memory _returnData) = _contract.call(_data); //solhint-disable-line avoid-low-level-calls
        if (!_success) {
            revert(string(_returnData));
        }
    }

    /**
     * @notice Executes bunch of functionalities and check if they are working or not
     * @dev Execute the codes array and revert with error message if code provided is incorrect
     * @param _codes Array of encoded data in bytes which acts as code to execute
     * @param _errorMsg Error message to throw when code execution call fails
     */
    function executeCodes(bytes[] memory _codes, string memory _errorMsg) internal {
        for (uint256 _j = 0; _j < _codes.length; _j++) {
            executeCode(_codes[_j], _errorMsg);
        }
    }
}
