
import React from "react";
import { Link } from "react-router-dom";
import BlockchainActions from "actions/BlockchainActions";
import Translate from "react-translate-component";
import { FormattedDate } from "react-intl";
import Operation from "../Blockchain/Operation";
import LinkToWitnessById from "../Utility/LinkToWitnessById";
import ChainTypes from "../Utility/ChainTypes";
import BindToChainState from "../Utility/BindToChainState";
import AssetWrapper from "../Utility/AssetWrapper";
import TransactionChart from "./TransactionChart";
import BlocktimeChart from "./BlocktimeChart";
import classNames from "classnames";
import utils from "common/utils";
import Immutable from "immutable";
import TimeAgo from "../Utility/TimeAgo";
import FormattedAsset from "../Utility/FormattedAsset";
import Ps from "perfect-scrollbar";
import TransitionWrapper from "../Utility/TransitionWrapper";
import NewIcon from "../NewIcon/NewIcon";

require("../Blockchain/json-inspector.scss");

class BlockTimeAgo extends React.Component {
    shouldComponentUpdate(nextProps) {
        return nextProps.blockTime !== this.props.blockTime;
    }

    render() {
        let { blockTime } = this.props;

        // let timePassed = Date.now() - blockTime;
        let timePassed = new Date().getTime() - new Date(blockTime).getTime();

        let textClass = classNames(
            "txtlabel",
            { success: timePassed <= 6000 },
            { info: timePassed > 6000 && timePassed <= 15000 },
            { warning: timePassed > 15000 && timePassed <= 25000 },
            { error: timePassed > 25000 }
        );

        return blockTime ? (
            <span className={textClass}>
                <TimeAgo time={blockTime} />
            </span>
        ) : null;
    }
}

class Blocks extends React.Component {
    static propTypes = {
        globalObject: ChainTypes.ChainObject.isRequired,
        dynGlobalObject: ChainTypes.ChainObject.isRequired
    };

    static defaultProps = {
        globalObject: "2.0.0",
        dynGlobalObject: "2.1.0",
        coreAsset: "1.3.0",
        latestBlocks: {},
        assets: {},
        accounts: {},
        height: 1
    };

    constructor(props) {
        super(props);

        this.state = {
            animateEnter: false,
            operationsHeight: null,
            blocksHeight: null
        };

        this._updateHeight = this._updateHeight.bind(this);
    }

    _getBlock(height, maxBlock) {
        if (height) {
            height = parseInt(height, 10);
            BlockchainActions.getLatest(height, maxBlock);
        }
    }

    UNSAFE_componentWillMount() {
        window.addEventListener("resize", this._updateHeight, {
            capture: false,
            passive: true
        });
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this._updateHeight);
    }

    UNSAFE_componentWillReceiveProps(nextProps) {
        if (nextProps.latestBlocks.size === 0) {
            return this._getInitialBlocks();
        } else if (!this.state.animateEnter) {
            this.setState({
                animateEnter: true
            });
        }

        let maxBlock = nextProps.dynGlobalObject.get("head_block_number");
        if (
            nextProps.latestBlocks.size >= 20 &&
            nextProps.dynGlobalObject.get("head_block_number") !==
            nextProps.latestBlocks.get(0).id
        ) {
            return this._getBlock(maxBlock, maxBlock);
        }
    }

    componentDidMount() {
        this._getInitialBlocks();
        let oc = this.refs.operations;
        Ps.initialize(oc);
        let blocks = this.refs.blocks;
        Ps.initialize(blocks);
        this._updateHeight();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            !Immutable.is(nextProps.latestBlocks, this.props.latestBlocks) ||
            !utils.are_equal_shallow(nextState, this.state)
        );
    }

    componentDidUpdate() {
        this._updateHeight();
    }

    _getInitialBlocks() {
        let maxBlock = parseInt(
            this.props.dynGlobalObject.get("head_block_number"),
            10
        );
        if (maxBlock) {
            for (let i = 19; i >= 0; i--) {
                let exists = false;
                if (this.props.latestBlocks.size > 0) {
                    for (let j = 0; j < this.props.latestBlocks.size; j++) {
                        if (
                            this.props.latestBlocks.get(j).id ===
                            maxBlock - i
                        ) {
                            exists = true;
                            break;
                        }
                    }
                }
                if (!exists) {
                    this._getBlock(maxBlock - i, maxBlock);
                }
            }
        }
    }

    _updateHeight() {
        let containerHeight = this.refs.outerWrapper.offsetHeight;
        let operationsTextHeight = this.refs.operationsText.offsetHeight;
        let blocksTextHeight = this.refs.blocksText.offsetHeight;

        this.setState(
            {
                operationsHeight: containerHeight - operationsTextHeight,
                blocksHeight: containerHeight - blocksTextHeight
            },
            this.psUpdate
        );
    }

    psUpdate() {
        let oc = this.refs.operations;
        Ps.update(oc);
        let blocks = this.refs.blocks;
        Ps.update(blocks);
    }

    render() {
        let {
            latestBlocks,
            latestTransactions,
            globalObject,
            dynGlobalObject,
            coreAsset
        } = this.props;

        let { blocksHeight, operationsHeight } = this.state;
        const dynamicObject = this.props.getDynamicObject(
            coreAsset.get("dynamic_asset_data_id")
        );
        let blocks = null,
            transactions = null;
        let headBlock = null;
        let trxCount = 0,
            blockCount = latestBlocks.size,
            trxPerSec = 0,
            blockTimes = [],
            avgTime = 0;

        if (latestBlocks && latestBlocks.size >= 20) {
            let previousTime;

            let lastBlock, firstBlock;

            // Map out the block times for the latest blocks and count the number of transactions
            latestBlocks
                .filter((a, index) => {
                    // Only use consecutive blocks counting back from head block
                    return (
                        a.id ===
                        dynGlobalObject.get("head_block_number") - index
                    );
                })
                .sort((a, b) => {
                    return a.id - b.id;
                })
                .forEach((block, index) => {
                    trxCount += block.transactions.length;
                    if (index > 0) {
                        blockTimes.push([
                            block.id,
                            (block.timestamp - previousTime) / 1000
                        ]);
                        lastBlock = block.timestamp;
                    } else {
                        firstBlock = block.timestamp;
                    }
                    previousTime = block.timestamp;
                });

            // Output block rows for the last 20 blocks
            blocks = latestBlocks
                .sort((a, b) => {
                    return b.id - a.id;
                })
                .take(20)
                .map(block => {
                    return (
                        <div key={block.id} className="blockchain__recent">

                            <Link
                                to={`/block/${block.id}`}
                                className="blockchain__link"
                            >
                                #{utils.format_number(block.id, 0)}
                            </Link>

                            <span className="blockchain__date">
                                <FormattedDate
                                    value={block.timestamp}
                                    format="full"
                                />
                            </span>

                            <span>
                                <LinkToWitnessById witness={block.witness} />
                            </span>

                            <span>
                                {utils.format_number(
                                    block.transactions.length,
                                    0
                                )}
                            </span>
                        </div>
                    );
                })
                .toArray();

            let trxIndex = 0;

            transactions = latestTransactions
                .sort((a, b) => {
                    return b.block_num - a.block_num;
                })
                .take(20)
                .map(trx => {
                    let opIndex = 0;
                    return trx.operations
                        .map(op => {
                            if (trxIndex > 15) return null;
                            return (
                                <Operation
                                    key={trxIndex++}
                                    op={op}
                                    result={trx.operation_results[opIndex++]}
                                    block={trx.block_num}
                                    hideFee={true}
                                    hideOpLabel={false}
                                    current={"1.2.0"}
                                    hideDate
                                    hidePending
                                    operationsInfo={true}
                                    mainPageMode={false}
                                    notificationMode={false}
                                    shortMode={false}
                                    explorerMode={true}
                                />
                            );
                        })
                        .filter(a => !!a);
                })
                .toArray();

            headBlock = latestBlocks.first().timestamp;
            avgTime = blockTimes.reduce((previous, current, idx, array) => {
                return previous + current[1] / array.length;
            }, 0);

            trxPerSec = trxCount / ((lastBlock - firstBlock) / 1000);
        }

        let blockNum = dynGlobalObject.get("head_block_number").toString();
        let formatBlockNum = blockNum.replace(/(\d)(?=(\d{3})+$)/g, "$1 ");

        return (
            <div ref="outerWrapper" className="cwd-common__wrap">
                <Translate
                    className="cwd-common__title"
                    component="span"
                    content="explorer.blocks.explorer"
                />
                {/* First row of stats */}
                <div className="blockchain__wrapper">
                    <div className="blockchain__item">
                        <div className="blockchain__inner">
                            <span className="blockchain__title">
                                <Translate
                                    component="span"
                                    content="explorer.blocks.current_block"
                                />
                            </span>
                            <div className="blockchain__data">
                                # {formatBlockNum}
                            </div>
                        </div>
                    </div>
                    <div className="blockchain__item">
                        <div className="blockchain__inner">
                            <span className="blockchain__title">
                                <Translate
                                    component="span"
                                    content="explorer.blocks.last_block"
                                />
                            </span>
                            <div className="blockchain__data">
                                <BlockTimeAgo blockTime={headBlock} />
                            </div>
                        </div>
                    </div>
                    <div className="blockchain__item">
                        <div className="blockchain__inner">
                            <span className="blockchain__title">
                                <Translate
                                    component="span"
                                    content="explorer.blocks.trx_per_sec"
                                />
                            </span>
                            <div className="blockchain__data ">
                                {utils.format_number(trxPerSec, 2)}
                            </div>
                        </div>
                    </div>
                    <div className="blockchain__item">
                        <div className="blockchain__inner">
                            <span className="blockchain__title">
                                <Translate
                                    component="span"
                                    content="explorer.blocks.avg_conf_time"
                                />
                            </span>
                            <div className="blockchain__data">
                                {utils.format_number(avgTime / 2, 2)}s
                            </div>
                        </div>
                    </div>

                    {/* Second row of stats */}
                    <Link
                        className="blockchain__item blockchain__item--link"
                        to="/witnesses"
                    >
                        <div className="blockchain__inner">
                            <span className="blockchain__title">
                                <Translate
                                    component="span"
                                    content="explorer.blocks.active_witnesses"
                                />
                            </span>
                            <div className="blockchain__data">
                                <span className="blockchain__icon-wrapper">
                                    <NewIcon
                                        iconWidth={24}
                                        iconHeight={24}
                                        iconName={"explorer_witneses"}
                                    />
                                </span>
                                {globalObject.get("active_witnesses").size}
                            </div>
                        </div>
                    </Link>

                    <div className="blockchain__item">
                        <div className="blockchain__inner">
                            <span className="blockchain__title">
                                <Translate
                                    component="span"
                                    content="explorer.blocks.active_committee_members"
                                />
                            </span>
                            <div className="blockchain__data">
                                <span className="blockchain__icon-wrapper">
                                    <NewIcon
                                        iconWidth={24}
                                        iconHeight={24}
                                        iconName={"committee_members"}
                                    />
                                </span>
                                {
                                    globalObject.get("active_committee_members")
                                        .size
                                }
                            </div>
                        </div>
                    </div>

                    <div className="blockchain__item">
                        <div className="blockchain__inner">
                            <span className="blockchain__title">
                                <Translate
                                    component="span"
                                    content="explorer.blocks.trx_per_block"
                                />
                            </span>
                            <div className="blockchain__data">
                                {utils.format_number(
                                    trxCount / blockCount || 0,
                                    2
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="blockchain__item">
                        <div className="blockchain__inner">
                            <span className="blockchain__title">
                                <Translate
                                    component="span"
                                    content="explorer.blocks.recently_missed_blocks"
                                />
                            </span>
                            <div
                                className="blockchain__data"
                                style={{ fontWeight: "100" }}
                            >
                                {dynGlobalObject.get("recently_missed_count")}
                            </div>
                        </div>
                    </div>
                </div>{" "}
                {/* blockchain__wrapper */}
                <div className="blockchain__amount-wrapper">
                    <div className="blockchain__amount">
                        <span className="blockchain__amount-title">
                            <Translate
                                component="span"
                                content="explorer.asset.summary.current_supply"
                            />
                        </span>
                        <span className="txtlabel blockchain__amount-data">
                            <NewIcon
                                iconWidth={24}
                                iconHeight={24}
                                iconName={"explorer_cwd_volume"}
                            />
                            {dynamicObject ? (
                                <FormattedAsset
                                    amount={dynamicObject.get("current_supply")}
                                    asset={coreAsset.get("id")}
                                    decimalOffset={5}
                                />
                            ) : null}
                        </span>
                    </div>
                    <div className="blockchain__amount">
                        <span className="blockchain__amount-title">
                            <Translate
                                component="span"
                                content="explorer.asset.summary.stealth_supply"
                            />
                        </span>
                        <span className="txtlabel blockchain__amount-data">
                            <NewIcon
                                iconWidth={24}
                                iconHeight={24}
                                iconName={"explorer_cwd_volume"}
                            />
                            {dynamicObject ? (
                                <FormattedAsset
                                    amount={dynamicObject.get(
                                        "confidential_supply"
                                    )}
                                    asset={coreAsset.get("id")}
                                    decimalOffset={5}
                                />
                            ) : null}
                        </span>
                    </div>
                </div>
                <div className="blockchain__graphs-wrapper">
                    <div className="blockchain__graph">
                        <div className="txtlabel blockchain__graph-title">
                            <Translate
                                component="span"
                                content="explorer.blocks.block_times"
                            />
                        </div>
                        <BlocktimeChart
                            blockTimes={blockTimes}
                            head_block_number={dynGlobalObject.get(
                                "head_block_number"
                            )}
                        />
                    </div>
                    <div className="blockchain__graph">
                        <div className="blockchain__graph-title">
                            <Translate
                                component="span"
                                content="explorer.blocks.trx_per_block"
                            />
                        </div>
                        <TransactionChart
                            blocks={latestBlocks}
                            head_block={dynGlobalObject.get(
                                "head_block_number"
                            )}
                        />
                    </div>
                </div>
                {/* Fourth row: transactions and blocks */}
                <div
                    ref="transactionsBlock"
                    className="blockchain__table-wrapper"
                >
                    <div className="blockchain__table" id="blockchainTable">
                        <div className="grid-block vertical no-overflow generic-bordered-box">
                            <div ref="operationsText">
                                <div className="blockchain__content-header">
                                    <Translate content="explorer.blocks.recent_ops_header" />
                                </div>

                                <div className="blockchain__table-header">
                                    <Translate content="explorer.blocks.recent_ops" />
                                </div>
                            </div>
                            <div className="grid-block" ref="operations">
                                <div className="table">
                                    <div>{transactions}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="blockchain__table">
                        <div className="grid-block vertical no-overflow generic-bordered-box">
                            <div ref="blocksText">
                                <div className="blockchain__content-header">
                                    <Translate
                                        component="span"
                                        content="explorer.blocks.recent"
                                    />
                                </div>
                            </div>
                            <div className="grid-block vertical" ref="blocks">
                                <div className="blockchain__table-header blockchain__table-header--multiple-mode">
                                    <Translate content="explorer.block.id" />
                                    <Translate content="explorer.block.date" />
                                    <Translate content="explorer.block.witness" />
                                    <Translate content="explorer.block.count" />
                                </div>

                                <TransitionWrapper
                                    component="div"
                                    transitionName="newrow"
                                    className="blockchain__blocks-list"
                                >
                                    {blocks}
                                </TransitionWrapper>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

Blocks = BindToChainState(Blocks, { show_loader: true });
Blocks = AssetWrapper(Blocks, {
    propNames: ["coreAsset"],
    withDynamic: true
});
export default Blocks;
