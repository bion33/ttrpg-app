import type {EquipmentSheetFactory} from '@pages/EquipmentPage/layout/nodes.ts'
import type {buildEquipped} from '@pages/EquipmentPage/layout/sections/equipped.ts'
import type {buildBackpack} from '@pages/EquipmentPage/layout/sections/backpack.ts'
import type {buildMoney} from '@pages/EquipmentPage/layout/sections/money.ts'
import type {buildStorage} from '@pages/EquipmentPage/layout/sections/storage.ts'
import type {Getter} from 'jotai'
import {carryCapacity, coinWeight, encumbranceLabel, totalItemWeight, totalStorageWeight} from '@pages/EquipmentPage/logic/formulas/formulas.ts'

/**
 * The sections whose weights the header's weight calculations sum: the equipped/backpack item rows, the money coins, and
 * the storage rows.
 */
interface WeightSources {
    equipped: ReturnType<typeof buildEquipped>
    backpack: ReturnType<typeof buildBackpack>
    money: ReturnType<typeof buildMoney>
    storage: ReturnType<typeof buildStorage>
}

/**
 * Builds the header fields: character name, class/level, and identity line. Carry weight is calculated from the item and
 * money weights, and storage weight from the storage rows, while the weight-calculation check is enabled.
 */
export function buildHeader({inputNode, checkNode, computedInputNode}: EquipmentSheetFactory, {equipped, backpack, money, storage}: WeightSources) {
    const strength = inputNode({id: 'strength', x: 360, y: 64, width: 146, height: 22, type: 'number', fontSize: 18, textAlign: 'left'})
    const enableCarryCapacityCalculation = checkNode({
        id: 'enableCarryCapacityCalculation',
        x: 609.34,
        y: 86.29,
        width: 7.25,
        height: 9,
        type: 'check',
        shape: 'star',
        defaultValue: true,
    })
    const enableWeightCalculation = checkNode({
        id: 'enableWeightCalculation',
        x: 773.54,
        y: 93.17,
        width: 7.25,
        height: 9,
        type: 'check',
        shape: 'star',
        defaultValue: true,
    })

    // The carry weight, shared by the carry-weight field and the encumbrance message.
    function carryWeightValue(get: Getter): number {
        const itemWeight = totalItemWeight([
            ...equipped.rows.map((row) => ({item: get(row.item.atom), weight: get(row.weight.atom)})),
            ...backpack.rows.map((row) => ({item: get(row.item.atom), weight: get(row.weight.atom)})),
        ])
        if (!get(money.enableMoneyWeightCalculation.atom)) return itemWeight
        const coins = [money.platinum, money.gold, money.electrum, money.silver, money.copper]
        return itemWeight + coinWeight(coins.map((coin) => get(coin.atom)))
    }

    return {
        characterName: inputNode({
            id: 'characterName',
            x: 88,
            y: 82,
            width: 230,
            height: 28,
            type: 'text',
            fontSize: 24,
            textAlign: 'center'
        }),

        strength,
        carryCapacity: computedInputNode(
            {id: 'carryingCapacity', x: 510, y: 64, width: 122, height: 22, type: 'number', fontSize: 18},
            enableCarryCapacityCalculation.atom,
            (get) => {
                const strengthValue = get(strength.atom)
                return strengthValue === null ? null : carryCapacity(strengthValue)
            },
        ),
        enableCarryCapacityCalculation,
        carryWeight: computedInputNode(
            {id: 'carryWeight', x: 639, y: 64, width: 116, height: 22, type: 'number', fontSize: 18},
            enableWeightCalculation.atom,
            (get): number | null => carryWeightValue(get),
        ),

        encumbrance: computedInputNode(
            {id: 'encumbrance', x: 360, y: 98, width: 272, height: 22, type: 'text', fontSize: 18},
            enableWeightCalculation.atom,
            (get): string => encumbranceLabel(carryWeightValue(get), get(strength.atom)),
        ),
        storageWeight: computedInputNode(
            {id: 'storageWeight', x: 639.1, y: 98, width: 116, height: 22, type: 'number', fontSize: 18},
            enableWeightCalculation.atom,
            (get): number | null => totalStorageWeight(
                [...storage.leftRows, ...storage.rightRows].map((row) => ({
                    count: get(row.count.atom),
                    weight: get(row.weight.atom),
                })),
            ),
        ),
        enableWeightCalculation,
    }
}
