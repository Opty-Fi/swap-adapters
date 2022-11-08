/* solhint-disable no-unused-vars*/
// SPDX-License-Identifier:MIT
pragma solidity =0.8.11;

//  helper contracts
import { AdapterModifiersBase } from "./utils/AdapterModifiersBase.sol";
import { ERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol";

//  libraries
import { Address } from "@openzeppelin/contracts-0.8.x/utils/Address.sol";

// interfaces
import { IAdapterV2 } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterV2.sol";
import { ICurveRegistryExchange } from "@optyfi/defi-legos/ethereum/curve/contracts/ICurveRegistryExchange.sol";
import { ICurveMetaRegistry } from "@optyfi/defi-legos/ethereum/curve/contracts/ICurveMetaRegistry.sol";
import { ICurveSwapV1 } from "@optyfi/defi-legos/ethereum/curve/contracts/ICurveSwapV1.sol";

/**
 * @title Adapter for Curve Registry Exchange
 * @author Opty.fi
 * @dev Abstraction layer to Curve Exchange
 */

contract CurveExchangeAdapter is IAdapterV2, AdapterModifiersBase {
    using Address for address;

    /*solhint-disable var-name-mixedcase*/
    /** @notice address of the curve registry exchange */
    ICurveRegistryExchange public immutable CurveRegistryExchange;

    /** @notice Curve Meta Registry */
    ICurveMetaRegistry public immutable META_REGISTRY;

    /** @notice address of wrapped network token */
    address public immutable WrappedNetworkToken;

    /** @notice  Curve Registry Address Provider */
    address public immutable ETH;

    /*solhint-enable var-name-mixedcase*/

    constructor(
        address _registry,
        ICurveRegistryExchange _curveRegistryExchange,
        ICurveMetaRegistry _metaRegistry,
        address _wrappedNetworkToken,
        address _eth
    ) AdapterModifiersBase(_registry) {
        CurveRegistryExchange = _curveRegistryExchange;
        META_REGISTRY = _metaRegistry;
        WrappedNetworkToken = _wrappedNetworkToken;
        ETH = _eth;
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
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            _codes = new bytes[](1);
            if (_getLpToken(_liquidityPool) == _inputToken) {
                int128 _tokenIndex = _getTokenIndex(_liquidityPool, _outputToken);
                _codes[0] = abi.encode(
                    _liquidityPool,
                    abi.encodeCall(
                        ICurveSwapV1(_liquidityPool).remove_liquidity_one_coin,
                        (
                            _amount,
                            _tokenIndex,
                            (_calcWithdrawOneCoin(_liquidityPool, _amount, _tokenIndex) * 9500) / 10000
                        )
                    )
                );
            } else {
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
            }
        }
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
    ) public view override returns (bytes[] memory _codes) {
        if (_amount > 0) {
            _codes = new bytes[](1);
            if (_getLpToken(_liquidityPool) == _inputToken) {
                // add liquidity
            } else {
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
            }
        }
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

    function _getLpToken(address _liquidityPool) internal view returns (address) {
        return META_REGISTRY.get_lp_token(_liquidityPool);
    }

    /**
     * @dev This functions returns the token index for a underlying token
     * @param _underlyingToken address of the underlying asset
     * @param _swapPool swap pool address
     * @return _tokenIndex index of coin in swap pool
     */
    function _getTokenIndex(address _swapPool, address _underlyingToken) internal view returns (int128) {
        address _inputToken = _underlyingToken == WrappedNetworkToken ? ETH : _underlyingToken;
        address[8] memory _underlyingTokens = _getUnderlyingTokens(_swapPool);
        for (uint256 _i; _i < 8; _i++) {
            if (_underlyingTokens[_i] == _inputToken) {
                return int128(int256(_i));
            }
        }
        return int128(0);
    }

    /**
     * @dev Get the underlying tokens within a swap pool.
     *      Note: For pools using lending, these are the
     *            wrapped coin addresses
     * @param _swapPool the swap pool address
     * @return list of coin addresses
     */
    function _getUnderlyingTokens(address _swapPool) internal view returns (address[8] memory) {
        return META_REGISTRY.get_underlying_coins(_swapPool);
    }

    function _calcWithdrawOneCoin(
        address _swapPool,
        uint256 _liquidityPoolTokenAmount,
        int128 _tokenIndex
    ) internal view returns (uint256) {
        if (_liquidityPoolTokenAmount > 0) {
            return ICurveSwapV1(_swapPool).calc_withdraw_one_coin(_liquidityPoolTokenAmount, _tokenIndex);
        }
        return 0;
    }
}
