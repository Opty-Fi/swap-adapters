// SPDX-License-Identifier: MIT

pragma solidity =0.8.11;

import { SafeERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import { ERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol";
import { IAdapterFull } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterFull.sol";

import { MultiCall } from "../utils/MultiCall.sol";

///////////////////////////////////////
/// THIS CONTRACTS MOCKS AS A VAULT ///
///////////////////////////////////////

////////////////////////////////
/// DO NOT USE IN PRODUCTION ///
////////////////////////////////

contract TestDeFiAdapter is MultiCall {
    using SafeERC20 for ERC20;

    function testGetDepositAllCodes(
        address _underlyingToken,
        address _liquidityPool,
        address _adapter,
        address _outputToken
    ) external {
        executeCodes(
            IAdapterFull(_adapter).getDepositAllCodes(
                payable(address(this)),
                _underlyingToken,
                _liquidityPool,
                _outputToken
            ),
            "depositAll"
        );
    }

    function testGetDepositSomeCodes(
        address _underlyingToken,
        address _liquidityPool,
        address _adapter,
        uint256 _amount,
        address _outputToken
    ) external {
        executeCodes(
            IAdapterFull(_adapter).getDepositSomeCodes(
                payable(address(this)),
                _underlyingToken,
                _liquidityPool,
                _outputToken,
                _amount
            ),
            "depositSome"
        );
    }

    function testGetWithdrawAllCodes(
        address _underlyingToken,
        address _liquidityPool,
        address _adapter,
        address _outputToken
    ) external {
        executeCodes(
            IAdapterFull(_adapter).getWithdrawAllCodes(
                payable(address(this)),
                _underlyingToken,
                _liquidityPool,
                _outputToken
            ),
            "withdrawAll"
        );
    }

    function testGetWithdrawSomeCodes(
        address _underlyingToken,
        address _liquidityPool,
        address _adapter,
        uint256 _amount,
        address _outputToken
    ) external {
        executeCodes(
            IAdapterFull(_adapter).getWithdrawSomeCodes(
                payable(address(this)),
                _underlyingToken,
                _liquidityPool,
                _outputToken,
                _amount
            ),
            "withdrawSome"
        );
    }

    function getERC20TokenBalance(address _token, address _account) external view returns (uint256) {
        return ERC20(_token).balanceOf(_account);
    }

    function giveAllowances(ERC20[] calldata _tokens, address[] calldata _spenders) external {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, "!LENGTH_MISMATCH");
        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], type(uint256).max);
        }
    }

    function revokeAllowances(ERC20[] calldata _tokens, address[] calldata _spenders) external {
        uint256 _tokensLen = _tokens.length;
        require(_tokensLen == _spenders.length, "!LENGTH_MISMATCH");
        for (uint256 _i; _i < _tokens.length; _i++) {
            _tokens[_i].safeApprove(_spenders[_i], 0);
        }
    }
}
