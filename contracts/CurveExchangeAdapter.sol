/* solhint-disable no-unused-vars*/
// SPDX-License-Identifier:MIT
pragma solidity =0.8.11;

//  helper contracts
import { AdapterModifiersBase } from "./utils/AdapterModifiersBase.sol";
import { ERC20 } from "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol";
import { CurveExchangeETHGateway } from "./CurveExchangeETHGateway.sol";

//  libraries
import { Address } from "@openzeppelin/contracts-0.8.x/utils/Address.sol";

// interfaces
import { IAdapterV2 } from "@optyfi/defi-legos/interfaces/defiAdapters/contracts/IAdapterV2.sol";
import { ICurveRegistryExchange } from "@optyfi/defi-legos/ethereum/curve/contracts/ICurveRegistryExchange.sol";
import { ICurveMetaRegistry } from "@optyfi/defi-legos/ethereum/curve/contracts/ICurveMetaRegistry.sol";
import { ICurveSwapV1 } from "@optyfi/defi-legos/ethereum/curve/contracts/ICurveSwapV1.sol";
import { ICurveSwap } from "@optyfi/defi-legos/ethereum/curve/contracts/interfacesV0/ICurveSwap.sol";

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

    /** @dev ETH gateway contract for curveExchange adapter */
    address public curveExchangeETHGatewayContract;

    constructor(
        address _registry,
        ICurveRegistryExchange _curveRegistryExchange,
        ICurveMetaRegistry _metaRegistry,
        address _wrappedNetworkToken,
        address _eth,
        address _ETH_sETH_STABLESWAP,
        address _ETH_ankrETH_STABLESWAP,
        address _ETH_rETH_STABLESWAP,
        address _ETH_stETH_STABLESWAP
    ) AdapterModifiersBase(_registry) {
        CurveRegistryExchange = _curveRegistryExchange;
        META_REGISTRY = _metaRegistry;
        WrappedNetworkToken = _wrappedNetworkToken;
        ETH = _eth;
        curveExchangeETHGatewayContract = address(
            new CurveExchangeETHGateway(
                _wrappedNetworkToken,
                _registry,
                _curveRegistryExchange,
                [_ETH_sETH_STABLESWAP, _ETH_ankrETH_STABLESWAP, _ETH_rETH_STABLESWAP, _ETH_stETH_STABLESWAP]
            )
        );
    }

    /*solhint-enable var-name-mixedcase*/

    /**
     * @inheritdoc IAdapterV2
     */
    function getDepositSomeCodes(
        address payable _vault,
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _inputTokenAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_inputTokenAmount > 0) {
            _codes = new bytes[](1);
            if (_getLpToken(_liquidityPool) == _inputToken) {
                int128 _tokenIndex = _getTokenIndex(_liquidityPool, _outputToken);
                _codes[0] = _outputToken == WrappedNetworkToken
                    ? abi.encode(
                        curveExchangeETHGatewayContract,
                        // solhint-disable-next-line max-line-length
                        abi.encodeWithSignature(
                            "withdrawETH(address,address,address,uint256,int128)",
                            _vault,
                            _liquidityPool,
                            _inputToken,
                            _inputTokenAmount,
                            _tokenIndex
                        )
                    )
                    : abi.encode(
                        _liquidityPool,
                        abi.encodeCall(
                            ICurveSwapV1(_liquidityPool).remove_liquidity_one_coin,
                            (
                                _inputTokenAmount,
                                _tokenIndex,
                                (_calcWithdrawOneCoin(_liquidityPool, _inputTokenAmount, _tokenIndex) * 9900) / 10000
                            )
                        )
                    );
            } else {
                uint256 _minAmount = (CurveRegistryExchange.get_exchange_amount(
                    _liquidityPool,
                    _inputToken == WrappedNetworkToken ? ETH : _inputToken,
                    _outputToken == WrappedNetworkToken ? ETH : _outputToken,
                    _inputTokenAmount
                ) * 9900) / 10000;
                if (_inputToken == WrappedNetworkToken) {
                    _codes[0] = abi.encode(
                        curveExchangeETHGatewayContract,
                        abi.encodeWithSignature(
                            "depositETHExchange(address,address,address,address,uint256,uint256)",
                            _vault,
                            ETH,
                            _liquidityPool,
                            _outputToken,
                            _inputTokenAmount,
                            _minAmount
                        )
                    );
                } else if (_outputToken == WrappedNetworkToken) {
                    _codes[0] = abi.encode(
                        curveExchangeETHGatewayContract,
                        abi.encodeWithSignature(
                            "withdrawETHExchange(address,address,address,address,uint256,uint256)",
                            _vault,
                            ETH,
                            _liquidityPool,
                            _inputToken,
                            _inputTokenAmount,
                            _minAmount
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
                            _inputTokenAmount,
                            _minAmount,
                            _vault
                        )
                    );
                }
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
        uint256 _outputTokenAmount
    ) public view override returns (bytes[] memory _codes) {
        if (_outputTokenAmount > 0) {
            _codes = new bytes[](1);
            if (_getLpToken(_liquidityPool) == _inputToken) {
                _codes[0] = _getDepositCode(_vault, _outputToken, _liquidityPool, _outputTokenAmount);
            } else {
                uint256 _minAmount = (CurveRegistryExchange.get_exchange_amount(
                    _liquidityPool,
                    _outputToken == WrappedNetworkToken ? ETH : _outputToken,
                    _inputToken == WrappedNetworkToken ? ETH : _inputToken,
                    _outputTokenAmount
                ) * 9900) / 10000;
                if (_inputToken == WrappedNetworkToken) {
                    _codes[0] = abi.encode(
                        curveExchangeETHGatewayContract,
                        abi.encodeWithSignature(
                            "withdrawETHExchange(address,address,address,address,uint256,uint256)",
                            _vault,
                            ETH,
                            _liquidityPool,
                            _outputToken,
                            _outputTokenAmount,
                            _minAmount
                        )
                    );
                } else if (_outputToken == WrappedNetworkToken) {
                    _codes[0] = abi.encode(
                        curveExchangeETHGatewayContract,
                        abi.encodeWithSignature(
                            "depositETHExchange(address,address,address,address,uint256,uint256)",
                            _vault,
                            ETH,
                            _liquidityPool,
                            _inputToken,
                            _outputTokenAmount,
                            _minAmount
                        )
                    );
                } else {
                    _codes[0] = abi.encode(
                        address(CurveRegistryExchange),
                        abi.encodeWithSignature(
                            "exchange(address,address,address,uint256,uint256,address)",
                            _liquidityPool,
                            _outputToken,
                            _inputToken,
                            _outputTokenAmount,
                            (CurveRegistryExchange.get_exchange_amount(
                                _liquidityPool,
                                _outputToken,
                                _inputToken,
                                _outputTokenAmount
                            ) * 9900) / 10000,
                            _vault
                        )
                    );
                }
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
        address _inputToken,
        address _liquidityPool,
        address _outputToken,
        uint256 _outputTokenAmount
    ) public view override returns (uint256) {
        if (_outputTokenAmount > 0) {
            if (_getLpToken(_liquidityPool) == _inputToken) {
                uint256 _nCoins = _getNCoins(_liquidityPool);
                address[8] memory _underlyingTokens = _getUnderlyingTokens(_liquidityPool);
                uint256[] memory _amounts = new uint256[](_nCoins);
                _outputToken = _outputToken == WrappedNetworkToken ? ETH : _outputToken;
                for (uint256 _i; _i < _nCoins; _i++) {
                    if (_underlyingTokens[_i] == _outputToken) {
                        _amounts[_i] = _outputTokenAmount;
                    }
                }
                if (_nCoins == 2) {
                    return ICurveSwap(_liquidityPool).calc_token_amount([_amounts[0], _amounts[1]], true);
                } else if (_nCoins == 3) {
                    return ICurveSwap(_liquidityPool).calc_token_amount([_amounts[0], _amounts[1], _amounts[2]], true);
                } else if (_nCoins == 4) {
                    return
                        ICurveSwap(_liquidityPool).calc_token_amount(
                            [_amounts[0], _amounts[1], _amounts[2], _amounts[3]],
                            true
                        );
                }
            } else {
                return
                    CurveRegistryExchange.get_exchange_amount(
                        _liquidityPool,
                        _outputToken == WrappedNetworkToken ? ETH : _outputToken,
                        _inputToken == WrappedNetworkToken ? ETH : _inputToken,
                        _outputTokenAmount
                    );
            }
        }
        return 0;
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
        if (_inputTokenAmount > 0) {
            if (_getLpToken(_liquidityPool) == _inputToken) {
                return
                    ICurveSwap(_liquidityPool).calc_withdraw_one_coin(
                        _inputTokenAmount,
                        _getTokenIndex(_liquidityPool, _outputToken)
                    );
            } else {
                return
                    CurveRegistryExchange.get_exchange_amount(
                        _liquidityPool,
                        _inputToken == WrappedNetworkToken ? ETH : _inputToken,
                        _outputToken == WrappedNetworkToken ? ETH : _outputToken,
                        _inputTokenAmount
                    );
            }
        }
        return 0;
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

    /**
     * @dev Get number of underlying tokens in a liquidity pool
     * @param _swapPool swap pool address associated with liquidity pool
     * @return  _nCoins Number of underlying tokens
     */
    function _getNCoins(address _swapPool) internal view returns (uint256) {
        return META_REGISTRY.get_n_underlying_coins(_swapPool);
    }

    /**
     * @dev This functions composes the function calls to deposit asset into deposit pool
     * @param _underlyingToken address of the underlying asset
     * @param _swapPool swap pool address
     * @param _amount the amount in underlying token
     * @return _codes function call to be executed from vault
     */
    function _getDepositCode(
        address payable _vault,
        address _underlyingToken,
        address _swapPool,
        uint256 _amount
    ) internal view returns (bytes memory _codes) {
        (
            int128 _underlyingTokenIndex,
            uint256 _nCoins,
            uint256[] memory _amounts,
            uint256 _minAmount
        ) = _getDepositCodeConfig(_underlyingToken, _swapPool, _amount);
        if (_nCoins == uint256(2)) {
            uint256[2] memory _depositAmounts = [_amounts[0], _amounts[1]];
            _codes = _underlyingToken == WrappedNetworkToken
                ? abi.encode(
                    curveExchangeETHGatewayContract,
                    abi.encodeWithSignature(
                        "depositETH(address,address,address,uint256[2],int128)",
                        _vault,
                        _swapPool,
                        _getLpToken(_swapPool),
                        _depositAmounts,
                        _underlyingTokenIndex
                    )
                )
                : abi.encode(
                    _swapPool,
                    abi.encodeWithSignature("add_liquidity(uint256[2],uint256)", _depositAmounts, _minAmount)
                );
        } else if (_nCoins == uint256(3)) {
            uint256[3] memory _depositAmounts = [_amounts[0], _amounts[1], _amounts[2]];
            _codes = abi.encode(
                _swapPool,
                abi.encodeWithSignature("add_liquidity(uint256[3],uint256)", _depositAmounts, _minAmount)
            );
        } else if (_nCoins == uint256(4)) {
            uint256[4] memory _depositAmounts = [_amounts[0], _amounts[1], _amounts[2], _amounts[3]];
            _codes = abi.encode(
                _swapPool,
                abi.encodeWithSignature("add_liquidity(uint256[4],uint256)", _depositAmounts, _minAmount)
            );
        }
    }

    /**
     * @dev This function composes the configuration required to construct fuction calls
     * @param _underlyingToken address of the underlying asset
     * @param _swapPool swap pool address
     * @param _amount amount in underlying token
     * @return _underlyingTokenIndex index of _underlyingToken
     * @return _nCoins number of underlying tokens in swap pool
     * @return _amounts value in an underlying token for each underlying token
     * @return _minMintAmount minimum amount of lp token that should be minted
     */
    function _getDepositCodeConfig(
        address _underlyingToken,
        address _swapPool,
        uint256 _amount
    )
        internal
        view
        returns (
            int128 _underlyingTokenIndex,
            uint256 _nCoins,
            uint256[] memory _amounts,
            uint256 _minMintAmount
        )
    {
        _nCoins = _getNCoins(_swapPool);
        address[8] memory _underlyingTokens = _getUnderlyingTokens(_swapPool);
        _amounts = new uint256[](_nCoins);
        address _curveishCoin = _underlyingToken == WrappedNetworkToken ? ETH : _underlyingToken;
        _underlyingTokenIndex = _getTokenIndex(_swapPool, _curveishCoin);
        for (uint256 _i; _i < _nCoins; _i++) {
            if (_underlyingTokens[_i] == _curveishCoin) {
                _amounts[_i] = _amount;
            }
        }
        if (_nCoins == uint256(2)) {
            _minMintAmount = (ICurveSwap(_swapPool).calc_token_amount([_amounts[0], _amounts[1]], true) * 9900) / 10000;
        } else if (_nCoins == uint256(3)) {
            _minMintAmount =
                (ICurveSwap(_swapPool).calc_token_amount([_amounts[0], _amounts[1], _amounts[2]], true) * 9900) /
                10000;
        } else if (_nCoins == uint256(4)) {
            _minMintAmount =
                (ICurveSwap(_swapPool).calc_token_amount([_amounts[0], _amounts[1], _amounts[2], _amounts[3]], true) *
                    9900) /
                10000;
        }
    }
}
