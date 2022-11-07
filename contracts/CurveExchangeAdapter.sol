/* solhint-disable no-unused-vars*/
// SPDX-License-Identifier:MIT
pragma solidity =0.8.11;

//  helper contracts
import { AdapterModifiersBase } from "./utils/AdapterModifiersBase.sol";
import { ERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol";

//  libraries
import { Address } from "@openzeppelin/contracts-0.8.x/utils/Address.sol";

// interfaces
import { IAdapterV2 } from "./IAdapterV2.sol";
import { ICurveRegistryExchange } from "./ICurveRegistryExchange.sol";

/**
 * @title Adapter for Curve Registry Exchange
 * @author Opty.fi
 * @dev Abstraction layer to Curve Exchange
 */

contract CurveExchangeAdapter is IAdapterV2, AdapterModifiersBase {
    using Address for address;

    ICurveRegistryExchange public immutable CurveRegistryExchange;

    constructor(address _registry, ICurveRegistryExchange _curveRegistryExchange) AdapterModifiersBase(_registry) {
        CurveRegistryExchange = _curveRegistryExchange;
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getDepositSomeCodes(
        address payable _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _amount
    ) public view override returns (bytes[] memory) {
        bytes[] memory _codes = new bytes[](1);
        _codes[0] = abi.encode(
            address(CurveRegistryExchange),
            abi.encodeWithSignature(
                "exchange(address,address,address,uint256,uint256,address)",
                _liquidityPool,
                _inputToken,
                _outputToken,
                _amount,
                CurveRegistryExchange.get_exchange_amount(_liquidityPool, _inputToken, _outputToken, _amount),
                _vault
            )
        );
        return _codes;
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getDepositAllCodes(
        address payable _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken
    ) external view override returns (bytes[] memory) {
        return
            getDepositSomeCodes(
                _vault,
                _inputToken,
                _liquidityPool,
                _outputToken,
                ERC20(_inputToken).balanceOf(_vault)
            );
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getWithdrawSomeCodes(
        address payable _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _amount
    ) public view override returns (bytes[] memory) {
        bytes[] memory _codes = new bytes[](1);
        _codes[0] = abi.encode(
            address(CurveRegistryExchange),
            abi.encodeWithSignature(
                "exchange(address,address,address,uint256,uint256,address)",
                _liquidityPool,
                _outputToken,
                _inputToken,
                _amount,
                CurveRegistryExchange.get_exchange_amount(_liquidityPool, _outputToken, _inputToken, _amount),
                _vault
            )
        );
        return _codes;
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getWithdrawAllCodes(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        address _outputToken
    ) external view override returns (bytes[] memory _codes) {
        return
            getWithdrawSomeCodes(
                _vault,
                _underlyingToken,
                _liquidityPool,
                _outputToken,
                ERC20(_outputToken).balanceOf(_vault)
            );
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getAllAmountInToken(
        address payable _vault,
        address _underlyingToken,
        address _liquidityPool,
        address _outputToken
    ) public view override returns (uint256) {
        return
            getSomeAmountInToken(_underlyingToken, _liquidityPool, _outputToken, ERC20(_outputToken).balanceOf(_vault));
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getLiquidityPoolTokenBalance(
        address payable _vault,
        address,
        address,
        address _outputToken
    ) public view override returns (uint256) {
        // balance of other token and not the underlyingToken
        return ERC20(_outputToken).balanceOf(_vault);
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function getSomeAmountInToken(
        address _underlyingToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _outputTokenAmount
    ) public view override returns (uint256) {
        return
            CurveRegistryExchange.get_exchange_amount(
                _liquidityPool,
                _outputToken,
                _underlyingToken,
                _outputTokenAmount
            );
    }

    /**
     * @inheritdoc IAdapterV2
     */
    function calculateAmountInLPToken(
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _inputTokenAmount
    ) external view override returns (uint256) {
        return CurveRegistryExchange.get_input_amount(_liquidityPool, _outputToken, _inputToken, _inputTokenAmount);
    }
}
