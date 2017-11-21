import React, { Component } from 'react';
import _ from 'lodash';
import classNames from 'classnames';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';
import Stars from './Stars';
import './App.css';

const MAX_CIRCLE_AMOUNT = 10;
const PARALLAX_AMOUNT_DIVISOR = 80;

const AVAILABLE_COLORS = {
  RED: '#FF5130',
  ORANGE: '#FEB422',
  YELLOW: '#FFDD30',
  GREEN: '#5CFF80',
  LIGHT_BLUE: '#A2FFFB',
  DARK_BLUE: '#4692FF',
  TEAL: '#9FFEC4',
  DARK_PURPLE: '#370078',
  PURPLE: '#A496FF',
  PINK: '#F7A2E0',
  DARK_GREY: '#3A3A3A',
  GREY: '#B4B4B4',
};

const SIZES = ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge', 'xxxlarge'];

const ANGLES = {
  0: '0deg',
  45: '45deg',
  135: '135deg',
  180: '180deg',
  225: '225deg',
  315: '315deg',
};

class App extends Component {
  constructor() {
    super();

    this.state = {
      circles: [],
      backgroundColor1: AVAILABLE_COLORS.ORANGE,
      backgroundColor2: AVAILABLE_COLORS.DARK_PURPLE,
      backgroundAngle: ANGLES[45],
      circleColor1: AVAILABLE_COLORS.RED,
      circleColor2: AVAILABLE_COLORS.PURPLE,
      circleColor3: AVAILABLE_COLORS.GREEN,
      circleAngle: ANGLES[45],
      activeCircle: null,
      stars: [],
      circleElements: [],
      sphereCount: 0,
    };
  }

  componentDidMount() {
    window.addEventListener("resize", this.throttledWindowResize); // TODO: remove event listener on unmount
  }

  throttledWindowResize = () => {
    _.throttle(this.onWindowResize, 10)();
  }

  onWindowResize = () => {
    const circles = _.map(this.state.circles, (circle) => {
      return _.assign({}, circle, {
        top: (window.innerHeight / 100) * circle.distanceAsPercent.top,
        left: (window.innerWidth / 100) * circle.distanceAsPercent.left,
      });
    })

    this.setState({ circles });
  }

  randomNumber = (min, max) => Math.floor(Math.random() * max) + min;

  getPointerCoordinatesFromCentre = (positionX, positionY) => {
    return {
      x: (window.innerWidth / 2) - positionX,
      y: (window.innerHeight / 2) - positionY,
    };
  }

  roundToTwo = (input) => _.round(input, 2);

  getTranslateAmountsFromCoordinates = (coordinates, multiplierFromZero, divisor) => {
    // multiplier comes from the counter, or the array index of a circle element, so
    // will sometimes be 0 or 1 but we don't want to multiply by these
    const MULTIPLIER_BUFFER = 2;

    const multiplier = multiplierFromZero + MULTIPLIER_BUFFER

    const translateX = (coordinates.x * (multiplier)) / divisor;
    const translateY = (coordinates.y * (multiplier)) / divisor;

    return {
      translateX,
      translateY,
    };
  }

  repositionCircles = (circles, pageX, pageY) => {
    let totals = _.map(circles, (circle, index) => {
      let el = document.getElementById(`circle-${ circle.id }`);
      let { top, left } = circle;
      let { transform } = el.style;
      let { translateX, translateY } = this.returnTransformValuesAsNumbers(transform);

      return {
        id: circle.id,
        totals: {
          vertical: top + translateY,
          horizontal: left + translateX,
        }
      }
    });

    circles = _.merge([], circles, totals);

    let repositionedCircles = _.map(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(pageX, pageY),
        index - 1,
        PARALLAX_AMOUNT_DIVISOR,
      );

      let top = circle.totals.vertical - translateY;
      let left = circle.totals.horizontal - translateX;

      return {
        id: circle.id,
        top,
        left,
        totals: {
          vertical: top + translateY, // just for debugging
          horizontal: left + translateX,
        },
        translateX,
        translateY,
      }
    });

    circles = _.merge([], circles, repositionedCircles);
    return circles;
  }

  removeCircleSurplus = (circles) => {
    if (circles.length > MAX_CIRCLE_AMOUNT) {
      let circleToBeRemoved = document.getElementById(`circle-${ circles[0].id }`);

      let cloned = circleToBeRemoved.cloneNode(true);
      cloned.classList.remove('circle');
      cloned.classList.add('removed-circle');
      cloned.id = '';
      document.body.appendChild(cloned);

      setTimeout(() => {
        document.body.removeChild(cloned);
      }, 1000)

      return circles.slice(1, circles.length);
    } else {
      return circles;
    }
  }

  makeCircle = (event) => {
    if (event.type === 'touchend') {
      event = event.nativeEvent;
    } else {
      event.persist();
    }

    let { pageX, pageY } = event;

    // const randomDimension = this.randomNumber(100, 250);

    const multiplierForTranslateAmounts = this.state.sphereCount > MAX_CIRCLE_AMOUNT ?
      MAX_CIRCLE_AMOUNT - 1 : this.state.sphereCount;

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(pageX, pageY),
      multiplierForTranslateAmounts,
      PARALLAX_AMOUNT_DIVISOR,
    );

    // let color = COLORS[this.randomNumber(0, COLORS.length)];
    let colorIndex = this.randomNumber(1, 3);
    let size = SIZES[this.randomNumber(0, SIZES.length)];

    let circles = this.state.circles;

    let top = pageY - translateY;
    let left = pageX - translateX;

    if (this.state.sphereCount >= MAX_CIRCLE_AMOUNT) {
      circles = this.repositionCircles(circles, pageX, pageY);
    }

    circles.push({
      id: this.state.sphereCount,
      colorIndex,
      size,
      // width: randomDimension,
      // height: randomDimension,
      distanceAsPercent: {
        top: (top * 100) / window.innerHeight,
        left: (left * 100) / window.innerWidth,
      },
      top,
      left,
      translateX,
      translateY,
    });

    circles = this.removeCircleSurplus(circles);

    const arrayOfIndexes = _.map([...Array(circles.length)], (_, index) => {
      return { index };
    });

    circles = _.merge([], circles, arrayOfIndexes);

    this.setState({
      circles,
      sphereCount: this.state.sphereCount + 1,
    }, () => {
      this.setState({
        circleElements: document.getElementsByClassName('circle'),
      });
    });
  };

  returnTransformValuesAsNumbers = (values) => {
    let numbers = values.match(/\(.*?\)/g);

    return {
      translateX: parseFloat(numbers[0].replace(/[^0-9|.|-]/g, '')),
      translateY: parseFloat(numbers[1].replace(/[^0-9|.|-]/g, '')),
    }
  }

  transformCircles = (circles, x, y) => {
    _.forEach(circles, (circle, index) => {
      const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
        this.getPointerCoordinatesFromCentre(x, y),
        index,
        PARALLAX_AMOUNT_DIVISOR,
      );

      circle.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`;
    });
  }

  sphereDrag = (pageX, pageY) => {
    let activeCircleIndex = _.find(this.state.circles, { id: this.state.activeCircle.id }).index;

    const { translateX, translateY } = this.getTranslateAmountsFromCoordinates(
      this.getPointerCoordinatesFromCentre(pageX, pageY),
      activeCircleIndex,
      PARALLAX_AMOUNT_DIVISOR,
    );

    let { top, left } = this.getPosition(
      pageX,
      pageY,
      translateX,
      translateY
    );

    return {
      top,
      left,
      translateX,
      translateY
    }
  }

  transformActiveCircle = (pageX, pageY) => {
    let activeCircleIndex = _.findIndex(this.state.circles, { id: this.state.activeCircle.id });

    const {
      top,
      left,
      translateX,
      translateY,
    } = this.sphereDrag(pageX, pageY);

    let distanceAsPercent = {
      top: (top * 100) / window.innerHeight,
      left: (left * 100) / window.innerWidth,
    };

    let newCircles = this.state.circles;

    newCircles[activeCircleIndex] = _.assign({}, newCircles[activeCircleIndex], {
      distanceAsPercent,
      top,
      left,
      translateX,
      translateY,
    });

    this.setState({ circles: newCircles });
  }

  getPosition = (pageX, pageY, translateX, translateY) => {
    const { pointerDistanceFromCircleCentre } = this.state.activeCircle;

    const top = pageY - translateY - pointerDistanceFromCircleCentre.y;
    const left = pageX - translateX - pointerDistanceFromCircleCentre.x;

    return {
      top,
      left,
    };
  }

  moveActiveCircle = (element, pageX, pageY) => {
    const {
      top,
      left,
      translateX,
      translateY,
    } = this.sphereDrag(pageX, pageY, element.offsetWidth);

    element.style.top = `${ top }px`;
    element.style.left = `${ left }px`;
    element.style.transform = `translateX(${ translateX }px) translateY(${ translateY }px)`
  }

  onMouseMove = (event) => {
    const { pageX, pageY } = event;

    if (this.state.circleElements.length) {
      this.transformCircles(this.state.circleElements, pageX, pageY);
    }

    if (this.state.activeCircle) {
      this.moveActiveCircle(this.state.activeCircle.element, pageX, pageY);
    }
  }

  onMouseDown = (event) => {
    if (!_.includes(event.target.classList, 'circle') && !_.includes(event.target.classList, 'no-circle')) {
      this.setState({ activeCircle: null });
    }
  }

  throttledMouseMove = (event) => {
    if (event.type === 'touchend') {
      event = event.nativeEvent;
    } else {
      event.persist();
    }

    _.throttle(this.onMouseMove.bind(this, event), 20)();
  }

  onMouseUp = (event) => {
    if (!_.includes(event.target.classList, 'no-circle')) {
      if (this.state.activeCircle && event.timeStamp - this.state.activeCircle.activeAt > 200) {
        this.transformActiveCircle(event.pageX, event.pageY);
        this.state.activeCircle.element.classList.remove('is-active');
        this.setState({ activeCircle: null });
      } else {
        this.makeCircle(event);
        this.setState({ activeCircle: null });
      };
    }
  }

  onCircleMouseDown = (event, circle) => {
    if (event.type === 'touchend') {
      event = event.nativeEvent;
    }

    const { pageX, pageY } = event;

    const {
      id,
      left,
      top,
    } = circle;

    let { transform } = event.target.style;
    let { translateX, translateY } = this.returnTransformValuesAsNumbers(transform);

    let pointerDistanceFromCircleCentre = {
      x: pageX - translateX - left,
      y: pageY - translateY - top,
    }

    if (!event.target.classList.contains('is-active')) {
      event.target.classList.add('is-active');
    }

    this.setState({
      activeCircle: {
        id,
        element: event.target,
        activeAt: event.timeStamp,
        pointerDistanceFromCircleCentre,
      },
    });
  }

  render() {
    const circleClassNames = (size) => {
      return classNames('circle', {
        'size-small': size === 'small',
        'size-xsmall': size === 'xsmall',
        'size-medium': size === 'medium',
        'size-large': size === 'large',
        'size-xlarge': size === 'xlarge',
        'size-xxlarge': size === 'xxlarge',
        'size-xxxlarge': size === 'xxxlarge',
      });
    }

    const ImagePreloader = () => {
      return (
        <div style={ {
          width: '0px',
          height: '0px',
          overflow: 'hidden',
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          background: `
            url('/dots-texture-dark.jpg')
          `
        } }/>
      );
    }

    const ColorSelect = ({ keyToChange }) => {
      return (
        <div className='color-select'>
          {
            _.map(AVAILABLE_COLORS, (color, index) => {
              return (
                <div key={ index }
                className={ classNames('color-select__item no-circle', {
                  'is-active': this.state[keyToChange] === color
                }) }
                style={ {
                  backgroundColor: color,
                } }
                onClick={ () => {
                  console.log('onClick()');
                  this.setState({
                    [keyToChange]: color,
                  });
                } }>
                  <img className="color-select__active-icon" src="/tick-icon.svg"/>
                </div>
              );
            })
          }
        </div>
      );
    }

    const AngleSelect = ({ keyToChange }) => {
      return (
        <div className="angle-select">
          {
            _.map(ANGLES, (angle, index) => {
              return (
                <div key={ index }
                className={ classNames('angle-select__item no-circle', {
                  'is-active': this.state[keyToChange] === angle
                }) }
                style={ {
                  background: `
                    linear-gradient(
                      ${ angle },
                      ${ this.state.backgroundColor1 } 0%,
                      ${ this.state.backgroundColor2 } 100%
                    )
                  `,
                } }
                onClick={ () => {
                  this.setState({
                    [keyToChange]: angle,
                  });
                } }>
                  <img className="angle-select__active-icon" src="/tick-icon.svg"/>
                </div>
              );
            })
          }
        </div>
      );
    }

    return (
      <div id="content" className="content"
      onMouseMove={ this.throttledMouseMove }
      onTouchMove={ this.throttledMouseMove }
      onMouseDown={ this.onMouseDown }
      onTouchStart={ this.onMouseDown }
      onMouseUp={ this.onMouseUp }
      onTouchEnd={ this.onMouseUp }
      style={ {
        height: '100%',
        background: `
          linear-gradient(
            ${ this.state.backgroundAngle },
            ${ this.state.backgroundColor1 } 0%,
            ${ this.state.backgroundColor2 } 100%
          )
        `,
        position: 'relative',
        overflow: 'hidden',
      } }
      >
        <div className="menu no-circle">

          <div className="menu__section">
            <div className="menu__section-title">
              Background
            </div>

            <div className="menu__section-item">
              <div onClick={ () => {
                this.setState((prevState) => {
                  return {
                    isBackgroundColor1Toggled: !prevState.isBackgroundColor1Toggled,
                  };
                });
              } }
              className="menu__section-item-title no-circle">
                Colour 1

                {
                  this.state.isBackgroundColor1Toggled ?
                  <div className="menu__section-item-close no-circle">
                    Close
                  </div>
                  : null
                }
              </div>

              {
                this.state.isBackgroundColor1Toggled ?
                <ColorSelect keyToChange='backgroundColor1'/>
                : null
              }
            </div>

            <div className="menu__section-item">
              <div onClick={ () => {
                this.setState((prevState) => {
                  return {
                    isBackgroundColor2Toggled: !prevState.isBackgroundColor2Toggled,
                  };
                });
              } }
              className="menu__section-item-title no-circle">
                Colour 2

                {
                  this.state.isBackgroundColor2Toggled ?
                  <div className="menu__section-item-close no-circle">
                    Close
                  </div>
                  : null
                }
              </div>

              {
                this.state.isBackgroundColor2Toggled ?
                <ColorSelect keyToChange='backgroundColor2'/>
                : null
              }
            </div>

            <div className="menu__section-item">
              <div onClick={ () => {
                this.setState((prevState) => {
                  return {
                    isBackgroundAngleToggled: !prevState.isBackgroundAngleToggled,
                  };
                });
              } }
              className="menu__section-item-title no-circle">
                Direction

                {
                  this.state.isBackgroundAngleToggled ?
                  <div className="menu__section-item-close no-circle">
                    Close
                  </div>
                  : null
                }
              </div>

              {
                this.state.isBackgroundAngleToggled ?
                <AngleSelect keyToChange='backgroundAngle'/>
                : null
              }
            </div>
          </div>

          <div className="menu__section">
            <div className="menu__section-title">
              Spheres
            </div>

            <div className="menu__section-item">
              <div onClick={ () => {
                this.setState((prevState) => {
                  return {
                    isCircleColor1Toggled: !prevState.isCircleColor1Toggled,
                  };
                });
              } }
              className="menu__section-item-title no-circle">
                Colour 1

                {
                  this.state.isCircleColor1Toggled ?
                  <div className="menu__section-item-close no-circle">
                    Close
                  </div>
                  : null
                }
              </div>

              {
                this.state.isCircleColor1Toggled ?
                <ColorSelect keyToChange='circleColor1'/>
                : null
              }
            </div>

            <div className="menu__section-item">
              <div onClick={ () => {
                this.setState((prevState) => {
                  return {
                    isCircleColor2Toggled: !prevState.isCircleColor2Toggled,
                  };
                });
              } }
              className="menu__section-item-title no-circle">
                Colour 2

                {
                  this.state.isCircleColor2Toggled ?
                  <div className="menu__section-item-close no-circle">
                    Close
                  </div>
                  : null
                }
              </div>

              {
                this.state.isCircleColor2Toggled ?
                <ColorSelect keyToChange='circleColor2'/>
                : null
              }
            </div>

            <div className="menu__section-item">
              <div onClick={ () => {
                this.setState((prevState) => {
                  return {
                    isCircleColor3Toggled: !prevState.isCircleColor3Toggled,
                  };
                });
              } }
              className="menu__section-item-title no-circle">
                Colour 3

                {
                  this.state.isCircleColor3Toggled ?
                  <div className="menu__section-item-close no-circle">
                    Close
                  </div>
                  : null
                }
              </div>

              {
                this.state.isCircleColor3Toggled ?
                <ColorSelect keyToChange='circleColor3'/>
                : null
              }
            </div>

            <div className="menu__section-item">
              <div onClick={ () => {
                this.setState((prevState) => {
                  return {
                    isCircleAngleToggled: !prevState.isCircleAngleToggled,
                  };
                });
              } }
              className="menu__section-item-title no-circle">
                Direction

                {
                  this.state.isCircleAngleToggled ?
                  <div className="menu__section-item-close no-circle">
                    Close
                  </div>
                  : null
                }
              </div>

              {
                this.state.isCircleAngleToggled ?
                <AngleSelect keyToChange='circleAngle'/>
                : null
              }
            </div>
          </div>
        </div>

        <ImagePreloader />
        {/* <div className="content__overlay" /> */}

        <CSSTransitionGroup
        transitionName="circle"
        transitionEnterTimeout={200}
        transitionLeaveTimeout={1}>
          { this.state.circles.map((circle, index) => {

            let color;
            if (circle.colorIndex === 1) {
              color = this.state.circleColor1;
            } else if (circle.colorIndex === 2) {
              color = this.state.circleColor2;
            } else if (circle.colorIndex === 3) {
              color = this.state.circleColor3;
            }

            return (
              <div className={ circleClassNames(circle.size) }
              id={ `circle-${ circle.id }` }
              key={ circle.id }
              onMouseDown={ (event) => this.onCircleMouseDown(event, circle) }
              onTouchStart={ (event) => this.onCircleMouseDown(event, circle) }
              style={ {
                background: `
                  linear-gradient(
                    ${ this.state.circleAngle },
                    ${ this.state.backgroundColor2 } 0%,
                    ${ color } 100%
                  )
                `,
                transform: `translateX(${ circle.translateX }px) translateY(${ circle.translateY }px)`,
                top: `${ circle.top }px`,
                left: `${ circle.left }px`,
                width: circle.width,
                height: circle.height,
              } }>
                {/* <div style={{background: 'white', flex: '1 1 auto', fontSize: '15px', fontWeight: 'bold'}}>
                  {circle.id}
                </div> */}
              </div>
            );
          }) }
        </CSSTransitionGroup>

        <Stars
        colors={ [this.state.circleColor1, this.state.circleColor2, this.state.circleColor3] }
        key={ 1 } />

        <Stars
        colors={ [this.state.circleColor1, this.state.circleColor2, this.state.circleColor3] }
        key={ 2 } />

        <Stars
        colors={ [this.state.circleColor1, this.state.circleColor2, this.state.circleColor3] }
        key={ 3 } />

      </div>
    );
  }
}

export default App;
