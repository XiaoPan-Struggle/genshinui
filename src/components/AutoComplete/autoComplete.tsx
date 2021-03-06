import React, {ChangeEvent, ReactElement, useEffect, useState, KeyboardEvent, useRef} from "react";
import Input, {InputProps} from "../Input/input";
import Icon from "../Icon";
import useDebounce from "../../hooks/useDebounce";
import classNames from "classnames";
import useClickOutside from "../../hooks/useClickOutside";
import Transition from "../Transition/transition";

interface DataSourceObject {
  value: string;
}

export type DataSourceType<T = {}> = T & DataSourceObject;

export interface AutoCompleteProps extends Omit<InputProps, "onSelect"> {
  fetchSuggestions: (str: string) => DataSourceType[] | Promise<DataSourceType[]>; // 处理要展示的数据
  onSelect?: (item: DataSourceType) => void; // 选择事件
  renderOption?: (item: DataSourceType) => ReactElement; // 自定义渲染模板
}

const AutoComplete: React.FC<AutoCompleteProps> = (props) => {
  const {fetchSuggestions, onSelect, value, renderOption, ...restProps} = props;
  const [inputValue, setInputValue] = useState<string>(value as string);
  const [suggestions, setSuggestions] = useState<DataSourceType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  // useState 会引起组件重新渲染，所以使用useRef
  // ref 数据取值要使用 .current
  const triggerSearch = useRef(false); // 控制搜索
  const componentRef = useRef<HTMLDivElement>(null); // 控制搜索栏隐藏
  // 自定义 hooks， 使用 useEffect 防抖
  const debouncedValue = useDebounce(inputValue, 500);
  const [showDropdown, setShowDropdown] = useState(false);
  // 点击别处，隐藏选择栏
  useClickOutside(componentRef, () => {
    setSuggestions([]);
  });
  useEffect(() => {
    if (debouncedValue && triggerSearch.current) {
      const results = fetchSuggestions(inputValue);
      // 支持异步
      if (results instanceof Promise) {
        console.log("triggered");
        setLoading(true);
        results.then(data => {
          setLoading(false);
          setSuggestions(data);
          if (data.length > 0) {
            setShowDropdown(true);
          }
        });
      } else {
        setSuggestions(results);
      }
    } else {
      setSuggestions([]);
    }
    // 重置高亮
    setHighlightIndex(-1);
  }, [debouncedValue]);
  const highlight = (index: number) => {
    console.log(index, "highlight index");
    if (index < 0) {
      index = 0;
    }
    if (index >= suggestions.length) {
      index = suggestions.length - 1;
    }
    setHighlightIndex(index);
  };
  // 选中事件
  const handleSelect = (item: DataSourceType) => {
    setInputValue(item.value); // input 框内容填充为选择的内容
    setSuggestions([]); // 将下方选择内容清空
    onSelect?.(item); // 将内容传递给用户
    triggerSearch.current = false;
  };
  type HandleKeyBoard = {
    [key: string]: () => void;
  }
  // 表驱动编程
  const HashKeyCodeHandle: HandleKeyBoard = {
    // Enter 键选中当前的 item
    13: () => suggestions[highlightIndex] && handleSelect(suggestions[highlightIndex]),
    // ↑ 键盘选中高亮item
    38: () => highlight(highlightIndex - 1),
    // ↓ 键盘选中高亮item
    40: () => highlight(highlightIndex + 1),
    // Esc 关闭搜索结果栏
    27: () => {
      console.log("esc");
      setShowDropdown(false);
    }
  };
  // 键盘事件
  const handleKeyDown = ({keyCode}: KeyboardEvent<HTMLInputElement>) => {
    console.log("keyboard", keyCode);
    HashKeyCodeHandle[keyCode]?.();
    // switch (keyCode) {
    //   case 13:
    //     // Enter 键选中当前的 item
    //     if (suggestions[highlightIndex]) {
    //       handleSelect(suggestions[highlightIndex]);
    //     }
    //     break;
    //   case 38:
    //     // ↑ 键盘选中高亮item
    //     highlight(highlightIndex - 1);
    //     break;
    //   case 40:
    //     // ↓ 键盘选中高亮item
    //     highlight(highlightIndex + 1);
    //     break;
    //   case 27:
    //     // Esc 关闭搜索结果栏
    //     console.log("esc");
    //     setShowDropdown(false);
    //     break;
    //   default:
    //     break;
    // }
  };
  // 输入框输入时执行
  // 输入框有值时，suggestions 设置成对应的提示值
  // 输入框没有值时，suggestions 为 空数组
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setInputValue(value);
    triggerSearch.current = true;

  };
  const renderTemplate = (item: DataSourceType) => {
    return renderOption ? renderOption(item) : item.value;
  };
  const generateDropdown = () => {
    return (
      <Transition in={showDropdown || loading}
                  animation="zoom-in-top"
                  timeout={300}
                  onExited={() => {setSuggestions([]);}}>
        <ul className="genshin-suggestion-list">
          {suggestions.map((item, index) => {
            const cnames = classNames("suggestion-item", {
              "is-active": index === highlightIndex
            });
            return (
              <li key={index} className={cnames} onClick={() => handleSelect(item)}>
                {renderTemplate(item)}
              </li>
            );
          })}
        </ul>
      </Transition>
    );
  };

  return (
    <div className="genshin-auto-complete" ref={componentRef}>
      <Input
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        {...restProps}
      />
      {loading && <ul><Icon icon={"spinner"} spin/></ul>}
      {(suggestions.length > 0) && generateDropdown()}
    </div>
  );
};

export default AutoComplete;
